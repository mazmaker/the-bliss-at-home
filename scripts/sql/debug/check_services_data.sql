SELECT 
    name_th,
    name_en,
    base_price,
    price_60,
    price_90, 
    price_120,
    duration_options,
    is_active
FROM services 
WHERE is_active = true 
ORDER BY sort_order, name_th;
