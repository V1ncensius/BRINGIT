<?php
// Helper respons JSON + format error seragam { message, errors }.
class Http
{
    public static function json($data, $status = 200)
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function fail($status, $message, $errors = [])
    {
        $body = ['message' => $message];
        if ($errors) $body['errors'] = (object) $errors;
        self::json($body, $status);
    }

    /** Badan JSON request (untuk POST/PUT/PATCH). */
    public static function body()
    {
        $raw = file_get_contents('php://input');
        if (!$raw) return [];
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
}
