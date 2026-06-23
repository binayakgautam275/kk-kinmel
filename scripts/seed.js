const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('Starting seed...');

    // 1. Roles
    const roles = [
        { id: 1, name: 'super_admin', description: 'Full system access, billing, multi-restaurant' },
        { id: 2, name: 'manager', description: 'Menu management, staff management, reports' },
        { id: 3, name: 'kitchen', description: 'Order queue view and status mutation only' },
        { id: 4, name: 'waiter', description: 'Session open/close, table management, delivery' },
        { id: 5, name: 'customer', description: 'Menu browsing and order placement within session' }
    ];
    for (const role of roles) {
        const { error } = await supabase.from('roles').upsert(role, { onConflict: 'id' });
        if (error) console.error('Error seeding roles:', error.message);
    }
    console.log('Roles seeded.');

    // 2. Demo Restaurant
    const restaurantId = '11111111-1111-1111-1111-111111111111';
    const { error: restError } = await supabase.from('restaurants').upsert({
        id: restaurantId,
        name: 'The House Cafe',
        slug: 'the-house',
        is_active: true
    }, { onConflict: 'id' });
    if (restError) console.error('Error seeding restaurant:', restError.message);
    else console.log('Restaurant seeded.');

    // 3. Settings
    const { error: setError } = await supabase.from('settings').upsert({
        restaurant_id: restaurantId,
        theme: {
            primaryColor: '#E85D04',
            secondaryColor: '#1B263B',
            fontFamily: 'Inter',
            borderRadius: 'lg',
            menuLayout: 'grid'
        },
        features: {
            tipsEnabled: true,
            feedbackEnabled: true,
            geofenceEnabled: false,
            geofenceRadiusMeters: 100
        },
        features_v2: {
            takeoutEnabled: true,
            loyaltyEnabled: true,
            dynamicPricingEnabled: false,
            ingredientTrackingEnabled: false,
            staffShiftsEnabled: true,
            splitBillingEnabled: true,
            serviceRequestsEnabled: true,
            nepalPayEnabled: true,
            defaultTaxRate: 13
        }
    }, { onConflict: 'restaurant_id' });
    if (setError) console.error('Error seeding settings:', setError.message);
    else console.log('Settings seeded.');

    // 3b. Loyalty Config
    const { error: loyaltyError } = await supabase.from('loyalty_config').upsert({
        restaurant_id: restaurantId,
        points_per_dollar: 10,
        redemption_threshold: 100,
        redemption_value: 5.00,
        silver_threshold: 500,
        gold_threshold: 1500,
        platinum_threshold: 5000,
        birthday_bonus_points: 50,
        signup_bonus_points: 25,
        is_active: true
    }, { onConflict: 'restaurant_id' });
    if (loyaltyError) console.error('Error seeding loyalty_config:', loyaltyError.message);
    else console.log('Loyalty config seeded.');

    // 4. Tables
    const tables = [
        { id: '22222222-2222-2222-2222-222222222201', restaurant_id: restaurantId, label: 'T1', qr_token: 'table-t1-token', capacity: 2 },
        { id: '22222222-2222-2222-2222-222222222202', restaurant_id: restaurantId, label: 'T2', qr_token: 'table-t2-token', capacity: 2 },
        { id: '22222222-2222-2222-2222-222222222203', restaurant_id: restaurantId, label: 'T3', qr_token: 'table-t3-token', capacity: 4 },
        { id: '22222222-2222-2222-2222-222222222204', restaurant_id: restaurantId, label: 'T4', qr_token: 'table-t4-token', capacity: 4 },
        { id: '22222222-2222-2222-2222-222222222205', restaurant_id: restaurantId, label: 'T5', qr_token: 'table-t5-token', capacity: 6 },
        { id: '22222222-2222-2222-2222-222222222206', restaurant_id: restaurantId, label: 'T6', qr_token: 'table-t6-token', capacity: 6 },
        { id: '22222222-2222-2222-2222-222222222207', restaurant_id: restaurantId, label: 'T7', qr_token: 'table-t7-token', capacity: 8 },
        { id: '22222222-2222-2222-2222-222222222208', restaurant_id: restaurantId, label: 'T8', qr_token: 'table-t8-token', capacity: 10 }
    ];
    for (const t of tables) {
        const { error } = await supabase.from('tables').upsert(t, { onConflict: 'id' });
        if (error) console.error('Error seeding table:', error.message);
    }
    console.log('Tables seeded.');

    // 5. Menu Categories
    const categories = [
        { id: '33333333-3333-3333-3333-333333333301', restaurant_id: restaurantId, name: 'Appetizers', sort_order: 1 },
        { id: '33333333-3333-3333-3333-333333333302', restaurant_id: restaurantId, name: 'Main Course', sort_order: 2 },
        { id: '33333333-3333-3333-3333-333333333303', restaurant_id: restaurantId, name: 'Specialty Coffee', sort_order: 3 },
        { id: '33333333-3333-3333-3333-333333333304', restaurant_id: restaurantId, name: 'Desserts', sort_order: 4 },
        { id: '33333333-3333-3333-3333-333333333305', restaurant_id: restaurantId, name: 'Cold Beverages', sort_order: 5 }
    ];
    for (const cat of categories) {
        const { error } = await supabase.from('menu_categories').upsert(cat, { onConflict: 'id' });
        if (error) console.error('Error seeding category:', cat.name, error.message);
    }
    console.log('Categories seeded.');

    // 6. Menu Items
    const items = [
        { id: '44444444-4444-4444-4444-444444444401', restaurant_id: restaurantId, category_id: '33333333-3333-3333-3333-333333333301', name: 'Bruschetta Trio', description: 'Classic tomato, mushroom truffle, and ricotta honey on ciabatta', price: 8.50, preparation_min: 8, is_available: true, allergens: ['gluten', 'dairy'], tags: ['vegetarian', 'popular'], image_url: 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?auto=format&fit=crop&q=80&w=800' },
        { id: '44444444-4444-4444-4444-444444444402', restaurant_id: restaurantId, category_id: '33333333-3333-3333-3333-333333333301', name: 'Crispy Calamari', description: 'Lightly fried calamari with garlic aioli and lemon wedge', price: 10.00, preparation_min: 10, is_available: true, allergens: ['gluten', 'seafood'], tags: ['popular'], image_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=800' },
        { id: '44444444-4444-4444-4444-444444444406', restaurant_id: restaurantId, category_id: '33333333-3333-3333-3333-333333333302', name: 'Grilled Ribeye Steak', description: '10oz USDA Choice ribeye with roasted garlic mashed potatoes and seasonal vegetables', price: 28.00, preparation_min: 20, is_available: true, allergens: ['dairy'], tags: ['popular', 'chef-pick'], image_url: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?auto=format&fit=crop&q=80&w=800' },
        { id: '44444444-4444-4444-4444-444444444407', restaurant_id: restaurantId, category_id: '33333333-3333-3333-3333-333333333302', name: 'Pan-Seared Salmon', description: 'Atlantic salmon with citrus glaze, wild rice, and asparagus', price: 24.00, preparation_min: 18, is_available: true, allergens: ['fish'], tags: ['healthy', 'popular'], image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&q=80&w=800' },
        { id: '44444444-4444-4444-4444-444444444411', restaurant_id: restaurantId, category_id: '33333333-3333-3333-3333-333333333303', name: 'Espresso', description: 'Double shot of our signature house blend', price: 3.50, preparation_min: 3, is_available: true, allergens: [], tags: ['hot'], image_url: 'https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?auto=format&fit=crop&q=80&w=800' },
        { id: '44444444-4444-4444-4444-444444444412', restaurant_id: restaurantId, category_id: '33333333-3333-3333-3333-333333333303', name: 'Cappuccino', description: 'Espresso with steamed milk and thick foam', price: 4.50, preparation_min: 4, is_available: true, allergens: ['dairy'], tags: ['hot', 'popular'], image_url: 'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&q=80&w=800' },
        { id: '44444444-4444-4444-4444-444444444416', restaurant_id: restaurantId, category_id: '33333333-3333-3333-3333-333333333304', name: 'Tiramisu', description: 'Classic Italian ladyfinger cake with espresso and mascarpone', price: 9.00, preparation_min: 5, is_available: true, allergens: ['dairy', 'gluten', 'eggs'], tags: ['popular'], image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&q=80&w=800' },
        { id: '44444444-4444-4444-4444-444444444417', restaurant_id: restaurantId, category_id: '33333333-3333-3333-3333-333333333304', name: 'Molten Chocolate Cake', description: 'Warm dark chocolate lava cake with vanilla bean ice cream', price: 10.00, preparation_min: 12, is_available: true, allergens: ['dairy', 'gluten', 'eggs'], tags: ['chef-pick'], image_url: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?auto=format&fit=crop&q=80&w=800' },
        { id: '44444444-4444-4444-4444-444444444421', restaurant_id: restaurantId, category_id: '33333333-3333-3333-3333-333333333305', name: 'Iced Americano', description: 'Double espresso over ice with cold water', price: 4.00, preparation_min: 3, is_available: true, allergens: [], tags: ['cold', 'popular'], image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&q=80&w=800' },
        { id: '44444444-4444-4444-4444-444444444422', restaurant_id: restaurantId, category_id: '33333333-3333-3333-3333-333333333305', name: 'Cold Brew', description: 'Slow-steeped 18-hour cold brew, smooth and bold', price: 5.00, preparation_min: 2, is_available: true, allergens: [], tags: ['cold', 'popular'], image_url: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&q=80&w=800' }
    ];
    for (const item of items) {
        const { error } = await supabase.from('menu_items').upsert(item, { onConflict: 'id' });
        if (error) console.error('Error seeding item:', item.name, error.message);
    }
    console.log('Menu Items seeded.');
    console.log('Done!');
}

seed().catch(console.error);
