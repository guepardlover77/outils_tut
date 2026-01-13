<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

namespace local_questionimporter\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_single_structure;
use core_external\external_value;
use context_course;
use context;
use qformat_xml;

/**
 * External function to import questions from Moodle XML.
 *
 * @package    local_questionimporter
 * @copyright  2025 CREM
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class import_questions extends external_api {

    /**
     * Returns description of method parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'categoryid' => new external_value(PARAM_INT, 'Target question category ID'),
            'xmlcontent' => new external_value(PARAM_RAW, 'Moodle XML content (base64 encoded)'),
        ]);
    }

    /**
     * Import questions from XML content.
     *
     * @param int $categoryid Target category ID
     * @param string $xmlcontent Base64 encoded XML content
     * @return array Import result
     */
    public static function execute(int $categoryid, string $xmlcontent): array {
        global $DB, $CFG, $USER;

        // Include required files.
        require_once($CFG->dirroot . '/question/format.php');
        require_once($CFG->dirroot . '/question/format/xml/format.php');
        require_once($CFG->dirroot . '/question/engine/bank.php');

        // Validate parameters.
        $params = self::validate_parameters(self::execute_parameters(), [
            'categoryid' => $categoryid,
            'xmlcontent' => $xmlcontent,
        ]);

        $categoryid = $params['categoryid'];
        $xmlcontent = $params['xmlcontent'];

        // Decode base64 content.
        $xmldata = base64_decode($xmlcontent);
        if ($xmldata === false) {
            return [
                'success' => false,
                'message' => 'Invalid base64 encoding',
                'imported' => 0,
                'errors' => ['Failed to decode base64 content'],
            ];
        }

        // Get the category and validate context.
        $category = $DB->get_record('question_categories', ['id' => $categoryid], '*', MUST_EXIST);
        $context = context::instance_by_id($category->contextid);
        self::validate_context($context);

        // Check capability.
        require_capability('moodle/question:add', $context);

        // Create a temporary file for the XML content.
        $tempdir = make_temp_directory('questionimport');
        $tempfile = $tempdir . '/import_' . time() . '_' . $USER->id . '.xml';
        file_put_contents($tempfile, $xmldata);

        try {
            // Initialize the XML format handler.
            $qformat = new qformat_xml();
            $qformat->setCategory($category);
            $qformat->setContexts([$context]);
            $qformat->setCourse(null);
            $qformat->setFilename($tempfile);
            $qformat->setRealfilename('import.xml');
            $qformat->setMatchgrades('nearest');
            $qformat->setCatfromfile(false);
            $qformat->setContextfromfile(false);
            $qformat->setStoponerror(false);

            // Read and import the questions.
            if (!$qformat->importpreprocess()) {
                return [
                    'success' => false,
                    'message' => 'Import preprocessing failed',
                    'imported' => 0,
                    'errors' => ['Failed to preprocess import file'],
                ];
            }

            if (!$qformat->importprocess()) {
                return [
                    'success' => false,
                    'message' => 'Import processing failed',
                    'imported' => 0,
                    'errors' => $qformat->get_import_errors() ?? ['Unknown error during import'],
                ];
            }

            $qformat->importpostprocess();

            // Get import statistics.
            $importcount = $qformat->get_importcount() ?? 0;
            $errors = $qformat->get_import_errors() ?? [];

            // Clean up temp file.
            @unlink($tempfile);

            return [
                'success' => true,
                'message' => "Successfully imported {$importcount} question(s)",
                'imported' => $importcount,
                'errors' => $errors,
            ];

        } catch (\Exception $e) {
            // Clean up temp file on error.
            @unlink($tempfile);

            return [
                'success' => false,
                'message' => 'Exception during import: ' . $e->getMessage(),
                'imported' => 0,
                'errors' => [$e->getMessage()],
            ];
        }
    }

    /**
     * Returns description of method result value.
     *
     * @return external_single_structure
     */
    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'success' => new external_value(PARAM_BOOL, 'Whether the import was successful'),
            'message' => new external_value(PARAM_TEXT, 'Result message'),
            'imported' => new external_value(PARAM_INT, 'Number of questions imported'),
            'errors' => new \core_external\external_multiple_structure(
                new external_value(PARAM_RAW, 'Error message'),
                'List of errors encountered', VALUE_OPTIONAL
            ),
        ]);
    }
}
