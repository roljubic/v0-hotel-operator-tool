-- =============================================================================
-- Script: Assign user to a hotel (run this manually in Supabase SQL editor)
-- =============================================================================

-- First, let's see what hotels exist
SELECT id, name, invite_code FROM public.hotels;

-- See the user's current hotel_id
SELECT id, email, full_name, role, hotel_id 
FROM public.users 
WHERE email = 'ro.ljubic@gmail.com';

-- Option 1: Create a new hotel and assign the user to it
-- (Uncomment and run if no hotels exist)

/*
-- Create a test hotel
INSERT INTO public.hotels (name, city, country, room_count)
VALUES ('Test Hotel', 'Test City', 'USA', 100)
RETURNING id, name, invite_code;
*/

-- Option 2: Assign user to an existing hotel
-- Replace 'YOUR_HOTEL_ID_HERE' with an actual hotel ID from the first query

/*
UPDATE public.users 
SET hotel_id = 'YOUR_HOTEL_ID_HERE', role = 'admin'
WHERE email = 'ro.ljubic@gmail.com';
*/

-- Option 3: Create hotel AND assign user in one go
DO $$
DECLARE
    new_hotel_id UUID;
    user_id UUID;
BEGIN
    -- Check if user exists and get their ID
    SELECT id INTO user_id FROM public.users WHERE email = 'ro.ljubic@gmail.com';
    
    IF user_id IS NULL THEN
        RAISE NOTICE 'User not found';
        RETURN;
    END IF;
    
    -- Check if user already has a hotel
    IF EXISTS (SELECT 1 FROM public.users WHERE id = user_id AND hotel_id IS NOT NULL) THEN
        RAISE NOTICE 'User already has a hotel assigned';
        RETURN;
    END IF;
    
    -- Create a new hotel
    INSERT INTO public.hotels (name, city, country, room_count)
    VALUES ('My Hotel', 'My City', 'USA', 100)
    RETURNING id INTO new_hotel_id;
    
    -- Assign user to the hotel and make them admin
    UPDATE public.users 
    SET hotel_id = new_hotel_id, role = 'admin'
    WHERE id = user_id;
    
    RAISE NOTICE 'Created hotel % and assigned user as admin', new_hotel_id;
END $$;

-- Verify the update worked
SELECT id, email, full_name, role, hotel_id 
FROM public.users 
WHERE email = 'ro.ljubic@gmail.com';
