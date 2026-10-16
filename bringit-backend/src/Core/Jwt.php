<?php
// JWT HS256 minimal (tanpa dependensi): login berlaku 7 hari (NFR-05).
class Jwt
{
    private static function b64($bin)
    {
        return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
    }

    private static function unb64($s)
    {
        $s = strtr($s, '-_', '+/');
        return base64_decode(str_pad($s, strlen($s) % 4 ? strlen($s) + 4 - strlen($s) % 4 : strlen($s), '='));
    }

    private static function secret()
    {
        $cfg = require dirname(__DIR__, 2) . '/config.php';
        return $cfg['jwt_secret'];
    }

    public static function issue($userId)
    {
        $head = self::b64(json_encode(['alg' => 'HS256', 'typ' => 'JWT']));
        $body = self::b64(json_encode(['sub' => (int) $userId, 'exp' => time() + 7 * 86400, 'iat' => time()]));
        $sig = self::b64(hash_hmac('sha256', "$head.$body", self::secret(), true));
        return "$head.$body.$sig";
    }

    /** Mengembalikan user id bila token valid, atau null. */
    public static function verify($token)
    {
        $parts = explode('.', (string) $token);
        if (count($parts) !== 3) return null;
        [$head, $body, $sig] = $parts;
        $expected = self::b64(hash_hmac('sha256', "$head.$body", self::secret(), true));
        if (!hash_equals($expected, $sig)) return null;
        $payload = json_decode(self::unb64($body), true);
        if (!is_array($payload) || empty($payload['sub']) || empty($payload['exp'])) return null;
        if ($payload['exp'] < time()) return null;
        return (int) $payload['sub'];
    }
}
