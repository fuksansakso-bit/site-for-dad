WITH latest_contact AS (
  SELECT DISTINCT ON (inquiry.contact_phone)
    inquiry.contact_phone,
    inquiry.contact_name,
    inquiry.locality,
    inquiry.created_at,
    inquiry.updated_at
  FROM order_inquiry inquiry
  ORDER BY inquiry.contact_phone, inquiry.created_at DESC, inquiry.id DESC
)
INSERT INTO customer_contact (
  display_name, phone_normalized, email_normalized, locality, created_at, updated_at
)
SELECT
  latest_contact.contact_name,
  latest_contact.contact_phone,
  NULL,
  latest_contact.locality,
  latest_contact.created_at,
  latest_contact.updated_at
FROM latest_contact
ON CONFLICT (phone_normalized) DO UPDATE
SET display_name = EXCLUDED.display_name,
    locality = EXCLUDED.locality,
    updated_at = GREATEST(customer_contact.updated_at, EXCLUDED.updated_at);

INSERT INTO customer_contact_request (customer_contact_id, inquiry_id, linked_at)
SELECT contact.id, inquiry.id, inquiry.created_at
FROM order_inquiry inquiry
JOIN customer_contact contact ON contact.phone_normalized = inquiry.contact_phone
ON CONFLICT (inquiry_id) DO NOTHING;
