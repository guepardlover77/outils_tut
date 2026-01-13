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
use context_system;
use context_course;

/**
 * External function to get courses the user can import questions to.
 *
 * @package    local_questionimporter
 * @copyright  2025 CREM
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class get_courses extends external_api {

    /**
     * Returns description of method parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    /**
     * Get courses where user can import questions.
     *
     * @return array List of courses
     */
    public static function execute(): array {
        global $USER, $DB;

        // Validate context.
        $context = context_system::instance();
        self::validate_context($context);

        // Check capability.
        require_capability('local/questionimporter:use', $context);

        // Get all courses.
        $courses = get_courses();
        $result = [];

        foreach ($courses as $course) {
            // Skip site course.
            if ($course->id == SITEID) {
                continue;
            }

            // Check if user can add questions in this course.
            $coursecontext = context_course::instance($course->id);
            if (has_capability('moodle/question:add', $coursecontext)) {
                $result[] = [
                    'id' => $course->id,
                    'shortname' => $course->shortname,
                    'fullname' => $course->fullname,
                    'visible' => $course->visible,
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
                'id' => new external_value(PARAM_INT, 'Course ID'),
                'shortname' => new external_value(PARAM_TEXT, 'Course short name'),
                'fullname' => new external_value(PARAM_TEXT, 'Course full name'),
                'visible' => new external_value(PARAM_BOOL, 'Course visibility'),
            ])
        );
    }
}
