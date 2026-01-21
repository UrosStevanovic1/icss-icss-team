CREATE SCHEMA "public";
CREATE TABLE "constraint_types" (
	"id" serial PRIMARY KEY,
	"is_active" boolean DEFAULT true NOT NULL,
	"name" varchar(80),
	"valid_from" date,
	"valid_to" date,
	"constraint_level" varchar,
	"constraint_format" varchar,
	"constraint_rule" text,
	"constraint_target" varchar
);
CREATE TABLE "groups" (
	"id" serial PRIMARY KEY,
	"Name" varchar(100) NOT NULL,
	"Size" integer NOT NULL,
	"Brief description" varchar(250),
	"Email" varchar(200),
	"Program" varchar,
	"Parent_Group" varchar
);
CREATE TABLE "lecturers" (
	"id" serial PRIMARY KEY,
	"first_name" varchar(200) NOT NULL,
	"title" varchar(20) NOT NULL,
	"employment_type" varchar(50) NOT NULL,
	"personal_email" varchar(200),
	"mdh_email" varchar(200),
	"phone" varchar(50),
	"last_name" varchar,
	"location" varchar,
	"teaching_load" varchar
);
CREATE TABLE "modules" (
	"module_code" varchar PRIMARY KEY DEFAULT nextval('modules_module_id_seq'::regclass),
	"name" varchar NOT NULL,
	"room_type" varchar NOT NULL,
	"semester" integer NOT NULL,
	"ects" integer,
	"assessment_type" varchar,
	"category" varchar,
	"study_program_id" integer NOT NULL,
	"specialization" integer
);
CREATE TABLE "rooms" (
	"id" serial PRIMARY KEY,
	"name" varchar NOT NULL,
	"capacity" integer NOT NULL,
	"type" varchar NOT NULL,
	"status" boolean NOT NULL,
	"Equipment" varchar,
	"location" varchar(200)
);
CREATE TABLE "scheduler_constraints" (
	"id" serial PRIMARY KEY,
	"constraint_type_id" integer NOT NULL,
	"hardness" varchar(10) NOT NULL,
	"weight" integer,
	"scope" varchar(20) NOT NULL,
	"target_id" integer,
	"config" jsonb DEFAULT '{}' NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE TABLE "specializations" (
	"id" serial PRIMARY KEY,
	"program_id" integer,
	"name" varchar NOT NULL,
	"acronym" varchar NOT NULL,
	"start_date" varchar NOT NULL,
	"status" boolean
);
CREATE TABLE "study_programs" (
	"id" serial PRIMARY KEY,
	"name" varchar NOT NULL,
	"acronym" varchar NOT NULL,
	"head_of_program" varchar NOT NULL,
	"status" boolean,
	"start_date" varchar NOT NULL,
	"total_ects" integer NOT NULL,
	"location" varchar(200)
);
ALTER TABLE "modules" ADD CONSTRAINT "constraint_1" FOREIGN KEY ("specialization") REFERENCES "specializations"("id");
ALTER TABLE "scheduler_constraints" ADD CONSTRAINT "scheduler_constraints_constraint_type_id_fkey" FOREIGN KEY ("constraint_type_id") REFERENCES "constraint_types"("id");
ALTER TABLE "specializations" ADD CONSTRAINT "constraint_15" FOREIGN KEY ("program_id") REFERENCES "study_programs"("id");
CREATE UNIQUE INDEX "constraint_types_pkey" ON "constraint_types" ("id");
CREATE INDEX "ix_constraint_types_id" ON "constraint_types" ("id");
CREATE UNIQUE INDEX "groups_pkey" ON "groups" ("id");
CREATE INDEX "ix_groups_id" ON "groups" ("id");
CREATE INDEX "ix_lecturers_id" ON "lecturers" ("id");
CREATE UNIQUE INDEX "lecturers_pkey" ON "lecturers" ("id");
CREATE INDEX "ix_modules_module_id" ON "modules" ("module_code");
CREATE UNIQUE INDEX "modules_pkey" ON "modules" ("module_code");
CREATE INDEX "ix_rooms_id" ON "rooms" ("id");
CREATE UNIQUE INDEX "ix_rooms_name" ON "rooms" ("name");
CREATE UNIQUE INDEX "rooms_pkey" ON "rooms" ("id");
CREATE INDEX "ix_scheduler_constraints_id" ON "scheduler_constraints" ("id");
CREATE UNIQUE INDEX "scheduler_constraints_pkey" ON "scheduler_constraints" ("id");
CREATE INDEX "ix_specializations_id" ON "specializations" ("id");
CREATE UNIQUE INDEX "specializations_pkey" ON "specializations" ("id");
CREATE INDEX "ix_study_programs_id" ON "study_programs" ("id");
CREATE INDEX "ix_study_programs_name" ON "study_programs" ("name");
CREATE UNIQUE INDEX "study_programs_pkey" ON "study_programs" ("id"); 
