-- Mesajlarda IBAN ve fiyat kuralları da geçerli (karar, 3. aşama: satış yasağı özel mesajla aşılmasın; telefon ve
-- e-posta özelde paylaşılabilir). Seed yalnızca boş tabloya yazdığı için var olan kurallar burada güncellenir.
UPDATE "moderation_rule"
SET "areas" = array_append("areas", 'message'::"moderation_area")
WHERE "kind" IN ('iban', 'price') AND NOT ('message' = ANY("areas"));
