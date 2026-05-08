INSERT INTO stores (name)
VALUES
  ('Lima'),
  ('Arequipa'),
  ('Cusco')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description)
VALUES
  ('Administrador', 'Acceso total al sistema y administración completa.'),
  ('Gerente', 'Gestiona productos de su tienda y revisa reportes de su ubicación.'),
  ('Empleado', 'Consulta productos y actualiza stock dentro de su tienda.'),
  ('Auditor', 'Acceso de solo lectura para auditoría y generación de reportes.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (
  email,
  password_hash,
  full_name,
  store_id,
  mfa_email_enabled,
  mfa_totp_enabled,
  active
)
SELECT
  seed.email,
  '$2b$10$c9/DAlAqksnVI78.X9l2rOWTtPHLFfUK0gVIlMGHl5.3QMkKAqNB2',
  seed.full_name,
  s.id,
  FALSE,
  FALSE,
  TRUE
FROM (
  VALUES
    (1, 'admin@techstore.com', 'Admin TechStore', 'Lima'),
    (2, 'gerente@techstore.com', 'Gerente General Lima', 'Lima'),
    (3, 'gerente_lima@techstore.com', 'Gerente Lima', 'Lima'),
    (4, 'empleado@techstore.com', 'Empleado Lima', 'Lima'),
    (5, 'auditor@techstore.com', 'Auditor TechStore', 'Cusco')
) AS seed(ordering, email, full_name, store_name)
INNER JOIN stores s ON s.name = seed.store_name
ORDER BY seed.ordering
ON CONFLICT (email) DO NOTHING;

UPDATE users
SET
  mfa_email_enabled = FALSE,
  mfa_totp_enabled = FALSE,
  mfa_totp_secret = NULL
WHERE email IN (
  'admin@techstore.com',
  'gerente@techstore.com',
  'gerente_lima@techstore.com',
  'empleado@techstore.com',
  'auditor@techstore.com'
);

INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT
  u.id,
  r.id,
  admin.id
FROM users u
INNER JOIN roles r
  ON r.name = CASE
    WHEN u.email = 'admin@techstore.com' THEN 'Administrador'
    WHEN u.email IN ('gerente@techstore.com', 'gerente_lima@techstore.com') THEN 'Gerente'
    WHEN u.email = 'empleado@techstore.com' THEN 'Empleado'
    WHEN u.email = 'auditor@techstore.com' THEN 'Auditor'
  END
INNER JOIN users admin ON admin.email = 'admin@techstore.com'
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO products (
  name,
  description,
  price,
  stock,
  category,
  store_id,
  is_premium,
  created_by
)
SELECT
  seed.name,
  seed.description,
  seed.price,
  seed.stock,
  seed.category,
  s.id,
  seed.is_premium,
  admin.id
FROM (
  VALUES
    (1, 'Laptop HP', 'Laptop empresarial con 16GB RAM y SSD de 512GB.', 4200.00, 8, 'Laptops', 'Lima', TRUE),
    (2, 'Mouse Logitech', 'Mouse inalámbrico para oficina.', 120.00, 25, 'Accesorios', 'Lima', FALSE),
    (3, 'Monitor Samsung 27', 'Monitor IPS 27 pulgadas.', 980.00, 12, 'Monitores', 'Arequipa', FALSE)
) AS seed(ordering, name, description, price, stock, category, store_name, is_premium)
INNER JOIN stores s ON s.name = seed.store_name
INNER JOIN users admin ON admin.email = 'admin@techstore.com'
WHERE NOT EXISTS (
  SELECT 1
  FROM products p
  WHERE p.name = seed.name AND p.store_id = s.id
)
ORDER BY seed.ordering;
