CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`type` text NOT NULL,
	`file_path` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`description` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`report_id`) REFERENCES `reports`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_attachments_report` ON `attachments` (`report_id`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`company_name` text NOT NULL,
	`address` text,
	`phone` text,
	`vat_number` text,
	`intervention_date` text NOT NULL,
	`performed_by` text NOT NULL,
	`intervention_location` text,
	`requested_by` text,
	`on_behalf_of` text,
	`intervention_reason` text,
	`description` text NOT NULL,
	`model` text,
	`serial_number` text,
	`production_year` text,
	`warranty` text,
	`payment` text,
	`hours_worked` real,
	`kilometers` real,
	`discount_percent` real DEFAULT 0,
	`hourly_total` real,
	`kilometer_total` real,
	`subtotal` real,
	`discount_amount` real,
	`discounted_subtotal` real,
	`vat_amount` real,
	`grand_total` real,
	`notes` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_reports_date` ON `reports` (`intervention_date`);--> statement-breakpoint
CREATE INDEX `idx_reports_company` ON `reports` (`company_name`);--> statement-breakpoint
CREATE INDEX `idx_reports_serial` ON `reports` (`serial_number`);