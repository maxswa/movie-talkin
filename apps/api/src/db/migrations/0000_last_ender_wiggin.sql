CREATE TABLE `brackets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`watch_party_id` integer NOT NULL,
	`round` integer NOT NULL,
	`suggestion_a_id` integer NOT NULL,
	`suggestion_b_id` integer NOT NULL,
	`winner_id` integer,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`watch_party_id`) REFERENCES `watch_parties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`suggestion_a_id`) REFERENCES `movie_suggestions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`suggestion_b_id`) REFERENCES `movie_suggestions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`winner_id`) REFERENCES `movie_suggestions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `category_suggestions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`watch_party_id` integer NOT NULL,
	`suggested_by` integer NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`watch_party_id`) REFERENCES `watch_parties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`suggested_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `magic_link_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `magic_link_tokens_token_unique` ON `magic_link_tokens` (`token`);--> statement-breakpoint
CREATE TABLE `movie_suggestions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`watch_party_id` integer NOT NULL,
	`suggested_by` integer NOT NULL,
	`tmdb_id` integer NOT NULL,
	`title` text NOT NULL,
	`poster_path` text,
	`overview` text,
	`release_year` integer,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`watch_party_id`) REFERENCES `watch_parties`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`suggested_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `movie_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bracket_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`voted_for` integer NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`bracket_id`) REFERENCES `brackets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`voted_for`) REFERENCES `movie_suggestions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `movie_votes_bracket_id_user_id_unique` ON `movie_votes` (`bracket_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `watch_group_members` (
	`group_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role` text DEFAULT 'guest' NOT NULL,
	`joined_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `watch_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `watch_group_members_group_id_user_id_unique` ON `watch_group_members` (`group_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `watch_groups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `watch_parties` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`watch_group_id` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`scheduled_for` text,
	`selected_category` text,
	`winning_suggestion_id` integer,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`watch_group_id`) REFERENCES `watch_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
