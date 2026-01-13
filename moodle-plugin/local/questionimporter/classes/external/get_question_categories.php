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
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use context_course;
use core_question\local\bank\question_bank_helper;

/**
 * External function to get question categories for a course.
 *
 * @package    local_questionimporter
 * @copyright  2025 CREM
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_question_categories extends external_api {

    /**
     * Returns description of method parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'courseid' => new external_value(PARAM_INT, 'Course ID'),
        ]);
    }

    /**
     * Get question categories for a course.
     *
     * @param int $courseid The course ID
     * @return array List of question categories
     */
    public static function execute(int $courseid): array {
        global $DB;

        // Validate parameters.
        $params = self::validate_parameters(self::execute_parameters(), [
            'courseid' => $courseid,
        ]);

        $courseid = $params['courseid'];

        // Validate context.
        $context = context_course::instance($courseid);
        self::validate_context($context);

        // Check capability.
        require_capability('moodle/question:add', $context);

        // Get question categories for this course context.
        $categories = $DB->get_records('question_categories', [
            'contextid' => $context->id,
        ], 'sortorder, name');

        $result = [];
        foreach ($categories as $category) {
            // Count questions in this category.
            $questioncount = $DB->count_records_sql(
                "SELECT COUNT(q.id)
                 FROM {question} q
                 JOIN {question_versions} qv ON qv.questionid = q.id
                 JOIN {question_bank_entries} qbe ON qbe.id = qv.questionbankentryid
                 WHERE qbe.questioncategoryid = ?",
                [$category->id]
            );

            $result[] = [
                'id' => $category->id,
                'name' => $category->name,
                'info' => $category->info ?? '',
                'questioncount' => $questioncount,
                'parent' => $category->parent,
            ];
        }

        // Also check for system-level categories if user has permission.
        $systemcontext = \context_system::instance();
        if (has_capability('moodle/question:add', $systemcontext)) {
            $syscategories = $DB->get_records('question_categories', [
                'contextid' => $systemcontext->id,
            ], 'sortorder, name');

            foreach ($syscategories as $category) {
                $questioncount = $DB->count_records_sql(
                    "SELECT COUNT(q.id)
                     FROM {question} q
                     JOIN {question_versions} qv ON qv.questionid = q.id
                     JOIN {question_bank_entries} qbe ON qbe.id = qv.questionbankentryid
                     WHERE qbe.questioncategoryid = ?",
                    [$category->id]
                );

                $result[] = [
                    'id' => $category->id,
                    'name' => '[Systeme] ' . $category->name,
                    'info' => $category->info ?? '',
                    'questioncount' => $questioncount,
                    'parent' => $category->parent,
                ];
            }
        }

        return $result;
    }

    /**
     * Returns description of method result value.
     *
     * @return external_multiple_structure
     */
    public static function execute_returns(): external_multiple_structure {
        return new external_multiple_structure(
            new external_single_structure([
                'id' => new external_value(PARAM_INT, 'Category ID'),
                'name' => new external_value(PARAM_TEXT, 'Category name'),
                'info' => new external_value(PARAM_RAW, 'Category description'),
                'questioncount' => new external_value(PARAM_INT, 'Number of questions in category'),
                'parent' => new external_value(PARAM_INT, 'Parent category ID'),
            ])
        );
    }
}
