import http from 'http';

function request(method: string, path: string, body?: any, headers: Record<string, string> = {}): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: 'localhost',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode || 200, body: parsed });
          } catch {
            resolve({ status: res.statusCode || 200, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('=== STARTING B&B SALON VERIFICATION TESTS ===\n');

  // 1. Send OTP for Customer Signup
  const testEmail = `verified.test.${Date.now()}@gmail.com`;
  const testPhone = '9826012345';
  const testName = 'Aarav Sharma';
  const testPassword = 'Password123!';

  console.log('Step 1: Requesting Gmail OTP for', testEmail);
  const otpRes = await request('POST', '/api/public/send-otp', { target: testEmail, type: 'email' });
  console.log('OTP Send Status:', otpRes.status, otpRes.body.message);
  if (otpRes.status !== 200) throw new Error('OTP send failed');

  // Read OTP from db or mock (in dev / server.ts OTP is stored in activeOtps in auth.ts or mock code returned)
  // Let's verify OTP using the endpoint
  // In server/auth.ts createRealtimeOtp generates code. In local dev, let's see if we can get code or signup with valid code
  // Wait, let's check how activeOtps works or if there is a dev OTP bypass or endpoint
}
