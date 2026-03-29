-- Add phone number to market_orders for courier delivery
-- International shipping services (Nova Poshta, DHL, etc.) require recipient phone

ALTER TABLE public.market_orders
  ADD COLUMN shipping_phone TEXT;

COMMENT ON COLUMN public.market_orders.shipping_phone IS
  'Recipient phone number for courier delivery contact';
