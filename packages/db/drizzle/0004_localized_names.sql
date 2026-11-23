-- Tür ve ırk adları dile göre jsonb: mevcut Türkçe adlar { "tr": … } olarak korunur.
ALTER TABLE "breed" ALTER COLUMN "name" SET DATA TYPE jsonb USING jsonb_build_object('tr', "name");--> statement-breakpoint
ALTER TABLE "species" ALTER COLUMN "name" SET DATA TYPE jsonb USING jsonb_build_object('tr', "name");