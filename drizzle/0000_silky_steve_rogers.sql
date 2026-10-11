CREATE TABLE `runs` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`score` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scores_ranking` ON `scores` (`score`,`created_at`);