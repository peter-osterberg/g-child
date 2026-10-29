<?php

namespace GChild_Console\Commands;

class Command_Helper {

	/**
	 * Handles the calling of search replace methods in file and returns the updated file
	 *
	 * @param string $template_file
	 * @param string $new_file
	 * @param array $template_variables
	 * @return int|false
	 */
	public static function make( string $template_file, string $new_file, array $template_variables = [] ) {
		$template_contents = static::replace_template_variables( file_get_contents( $template_file ), $template_variables );

		return file_put_contents( $new_file, $template_contents );
	}

	/**
	 * Search replace and returns the file contents with provided template variables and their values
	 *
	 * @param string $file_contents
	 * @param array $template_variables
	 * @return string
	 */
	public static function replace_template_variables( string $file_contents, array $template_variables = [] ) {
		foreach ( $template_variables as $variable_name => $replacement ) {
			$file_contents = str_replace( $variable_name, $replacement, $file_contents );
		}

		return $file_contents;
	}

	/**
	 * Gets the folders full path if it exists
	 * Creates the folder in the path if it doesn't exists
	 * Finally returns the path
	 *
	 * @param string $folder
	 * @param string $old_folder
	 * @return string
	 */
	public static function get_or_create_folder( string $folder, string $old_folder = '' ) {

		if ( ! file_exists( $folder ) ) {
			mkdir( $folder, 0775 );

			$index_file_name = $folder . '/index.php';

			if ( ! file_exists( $index_file_name ) ) {
				$index_template = $old_folder . '/index.php';
				file_put_contents( $index_file_name, file_get_contents( $index_template ) );
			}
		}

		return $folder;
	}
}
