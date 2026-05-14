CREATE INDEX `brackets_party_id_idx` ON `brackets` (`watch_party_id`);--> statement-breakpoint
CREATE INDEX `brackets_party_round_idx` ON `brackets` (`watch_party_id`,`round`);--> statement-breakpoint
CREATE INDEX `category_suggestions_party_id_idx` ON `category_suggestions` (`watch_party_id`);--> statement-breakpoint
CREATE INDEX `magic_link_tokens_user_id_idx` ON `magic_link_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `movie_suggestions_party_id_idx` ON `movie_suggestions` (`watch_party_id`);--> statement-breakpoint
CREATE INDEX `watch_group_members_user_id_idx` ON `watch_group_members` (`user_id`);--> statement-breakpoint
CREATE INDEX `watch_parties_group_id_idx` ON `watch_parties` (`watch_group_id`);--> statement-breakpoint
CREATE INDEX `watch_parties_status_idx` ON `watch_parties` (`status`);