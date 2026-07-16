const mockGetUser = jest.fn().mockResolvedValue({
  data: { user: { id: 'test-user', email: 'admin@puskesmas.id' } },
  error: null
});
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockAdmin = { signOut: mockSignOut };

jest.mock('../src/config/supabase', () => {
  const mockAuth = {
    getUser: mockGetUser,
    signInWithPassword: mockSignInWithPassword,
    admin: mockAdmin
  };

  function createMockClient() {
    const mockStorage = {
      from: jest.fn().mockReturnThis(),
      upload: jest.fn().mockResolvedValue({ data: null, error: null }),
      download: jest.fn().mockResolvedValue({ data: null, error: null }),
      remove: jest.fn().mockResolvedValue({ data: null, error: null })
    };

    return {
      auth: mockAuth,
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      storage: mockStorage
    };
  }

  return {
    supabase: createMockClient(),
    supabaseAdmin: createMockClient()
  };
});

process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-anon-key';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.PORT = '0';
