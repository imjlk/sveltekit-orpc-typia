CREATE TABLE `post_activity` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` text NOT NULL,
	`post_id` integer NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `post_activity_event_id_unique` ON `post_activity` (`event_id`);--> statement-breakpoint
CREATE INDEX `post_activity_user_id_idx` ON `post_activity` (`user_id`);--> statement-breakpoint
CREATE INDEX `post_activity_post_id_idx` ON `post_activity` (`post_id`);