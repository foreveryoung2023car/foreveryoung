insert into stores (code, name, city, address) values
  ('kyoto1', '京都清水寺店', '京都', '京都'),
  ('osaka1', '大阪日本橋店', '大阪', '大阪'),
  ('kyoto2', '京都祇園店', '京都', '京都'),
  ('tokyo1', '東京淺草寺店', '東京', '東京')
on conflict (code) do update set
  name = excluded.name,
  city = excluded.city,
  address = excluded.address,
  active = true,
  updated_at = now();
