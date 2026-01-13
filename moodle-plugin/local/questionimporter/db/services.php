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

/**
 * Web service definitions for local_questionimporter.
 *
 * @package    local_questionimporter
 * @copyright  2025 CREM
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$functions = [
    // Get list of courses the user can access.
    'local_questionimporter_get_courses' => [
        'classname'     => 'local_questionimporter\external\get_courses',
        'description'   => 'Get list of courses the user can import questions to.',
        'type'          => 'read',
        'ajax'          => true,
        'capabilities'  => 'local/questionimporter:use',
        'services'      => ['questionimporter'],
    ],

    // Get question categories for a course.
    'local_questionimporter_get_question_categories' => [
        'classname'     => 'local_questionimporter\external\get_question_categories',
        'description'   => 'Get question categories (question banks) for a course.',
        'type'          => 'read',
        'ajax'          => true,
        'capabilities'  => 'local/questionimporter:use',
        'services'      => ['questionimporter'],
    ],

    // Import questions from XML.
    'local_questionimporter_import_questions' => [
        'classname'     => 'local_questionimporter\external\import_questions',
        'description'   => 'Import questions from Moodle XML format into a question category.',
        'type'          => 'write',
        'ajax'          => true,
        'capabilities'  => 'local/questionimporter:importquestions',
        'services'      => ['questionimporter'],
    ],
];

// Define the external service.
$services = [
    'Question Importer Service' => [
        'functions' => [
            'local_questionimporter_get_courses',
            'local_questionimporter_get_question_categories',
            'local_questionimporter_import_questions',
        ],
        'restrictedusers' => 0,
        'enabled' => 1,
        'shortname' => 'questionimporter',
        'downloadfiles' => 0,
        'uploadfiles' => 1,
    ],
];
