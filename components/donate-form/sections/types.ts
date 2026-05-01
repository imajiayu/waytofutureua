export type FieldKey = 'donationAmount' | 'quantity' | 'tipAmount' | 'total' | 'name' | 'email'

export type FieldErrors = Partial<Record<FieldKey, string>>
