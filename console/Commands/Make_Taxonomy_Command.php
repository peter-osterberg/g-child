<?php

namespace GChild_Console\Commands;

use GChild_Console\Commands\Command_Helper;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Question\Question;

class Make_Taxonomy_Command extends Command {

	/**
	 * @inheritDoc
	 */
	protected static $defaultName = 'make:tax'; // phpcs:ignore

	/**
	 * @inheritDoc
	 */
	protected static $defaultDescription = 'Create a new custom taxonomy'; // phpcs:ignore

	/**
	 * @inheritDoc
	 */
	public $taxonomy_name = 'Taxonomy name';

	/**
	 * @inheritDoc
	 */
	public $taxonomy_slug = 'Taxonomy slug';

	/**
	 * @inheritDoc
	 */
	public $taxonomy_post_type = 'Taxonomy post type';

	/**
	 * @inheritDoc
	 */
	public $taxonomy_singular = 'Taxonomy singular';

	/**
	 * @inheritDoc
	 */
	public $taxonomy_plural = 'Taxonomy plural';

	/**
	 * @inheritDoc
	 */
	public $taxonomy_icon = 'dashicons-image-filter';

	/**
	 * @inheritDoc
	 */
	public $taxonomy_fields = 'Taxonomy fields';

	/**
	 * Configure this command
	 *
	 * @return void
	 */
	public function configure() {
		$this
			->setDescription( 'fields' )
			->setHelp( 'This command allows you to get user input after the command is executed.' );
	}

	/**
	 * Execute the command
	 *
	 * @param \Symfony\Component\Console\Input\InputInterface $input
	 * @param \Symfony\Component\Console\Output\OutputInterface $output
	 * @return int
	 */
	protected function execute( InputInterface $input, OutputInterface $output ): int {
		/** @var Symfony\Component\Console\Helper\QuestionHelper $helper */
		$helper = $this->getHelper( 'question' ); // Question helper
		$this->taxonomy_name = $helper->ask( $input, $output, new Question( 'Taxonomy name (eg. "gt_genre"): ' ) );
		$this->taxonomy_slug = $helper->ask( $input, $output, new Question( 'Taxonomy slug (eg. "genre"): ' ) );
		$this->taxonomy_post_type = $helper->ask( $input, $output, new Question( 'Connected post type (eg. "gt_books"): ' ) );
		$this->taxonomy_singular = $helper->ask( $input, $output, new Question( 'Taxonomy singular string (eg. "Genre"): ' ) );
		$this->taxonomy_plural = $helper->ask( $input, $output, new Question( 'Taxonomy plural string (eg. "Genres"): ' ) );
		$taxonomy_icon = $helper->ask( $input, $output, new Question( 'Icon fom dashicons - eg. "dashicons-image-filter" (optional): ' ) );

		if ( ! empty( $taxonomy_icon ) ) {
			$this->taxonomy_icon = $taxonomy_icon;
		}

		$this->taxonomy_name = implode(
			'_',
			array_map(
				fn( $part ) => strtolower( $part ),
				explode( ' ', $this->taxonomy_name )
			)
		);
		$this->taxonomy_post_type = implode(
			'_',
			array_map(
				fn( $part ) => strtolower( $part ),
				explode( ' ', $this->taxonomy_post_type )
			)
		);
		$this->taxonomy_singular = implode(
			"'",
			array_map(
				fn( $part ) => $part,
				explode( "'", $this->taxonomy_singular )
			)
		);
		$this->taxonomy_plural = implode(
			"'",
			array_map(
				fn( $part ) => $part,
				explode( "'", $this->taxonomy_plural = $this->taxonomy_plural )
			)
		);

		$args = [
			$this->taxonomy_name,
			$this->taxonomy_slug,
			$this->taxonomy_post_type,
			$this->taxonomy_singular,
			$this->taxonomy_plural,
		];

		foreach ( $args as $arg ) {
			$string_is_english = preg_match( '/[^a-zA-Z_]+/', $arg );

			if ( $string_is_english ) {
				$output->writeln( 'Only use English and "_" characters for the post type name!' );
				return Command::FAILURE;
			}
		}

		$output->writeln( 'Setting up taxonomy. Please wait!' );

		$was_successful = $this->setup_taxonomy( $output );

		if ( ! $was_successful ) {
			$output->writeln(
				[
					'',
					'====== ERROR ======',
					'The taxonomy already exists!',
					'',
				]
			);
			return Command::FAILURE;
		}

		$output->writeln( sprintf( 'All done! Taxonomy: %s is now set up !', $this->taxonomy_name ) );
		return Command::SUCCESS;
	}

	/**
	 * Clone the new module
	 *
	 * @return bool
	 */
	public function setup_taxonomy( OutputInterface $output ) {
		$taxonomies_file_path = __DIR__ . '/../../inc/Customization/Utils/Child_Taxonomies.php';
		$gchild_taxonomy_file_contents = file_get_contents( $taxonomies_file_path );

		$post_types_file_path = __DIR__ . '/../../inc/Customization/Utils/Child_Post_Types.php';
		$gchild_post_type_file_contents = file_get_contents( $post_types_file_path );

		$taxonomy_registered_in_file = strpos( $gchild_taxonomy_file_contents, $this->taxonomy_name );
		if ($taxonomy_registered_in_file !== false) return false;

		$post_type_registered_in_file = strpos( $gchild_post_type_file_contents, $this->taxonomy_post_type );
		if ($post_type_registered_in_file !== false) $output->writeln( 'Post type does is not set up' );

		$gchild_taxonomy_file_contents = str_replace(
			[
				'/* TAXONOMY */',
			],
			[
				"/* TAXONOMY */\r
			[
				'name'      => '" . $this->taxonomy_name . "',
				'post_type' => '" . $this->taxonomy_post_type . "',
				'slug'      => '" . $this->taxonomy_slug . "',
				'singular'  => esc_html__( '" . $this->taxonomy_singular . "', 'g-theme-child' ),
				'plural'    => esc_html__( '" . $this->taxonomy_plural . "', 'g-theme-child' ),
				'options'   => [
					'public'    => true,
					'show_ui'   => true,
					'menu_icon' => '" . $this->taxonomy_icon . "',
				],
			],",
			],
			$gchild_taxonomy_file_contents
		);

		file_put_contents( $taxonomies_file_path, $gchild_taxonomy_file_contents );

		return true;
	}
}
