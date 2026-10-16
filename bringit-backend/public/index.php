<?php
// Pintu masuk API: memuat Core + Controllers lalu mendaftarkan rute progres 30%.
// Jalankan: php -S 127.0.0.1:8000 -t public public/index.php
error_reporting(E_ALL & ~E_DEPRECATED);
date_default_timezone_set('Asia/Jakarta');

$origin = '*';
try {
    $cfg = require __DIR__ . '/../config.php';
    if (!empty($cfg['cors_origin'])) $origin = $cfg['cors_origin'];
} catch (Throwable $e) {
    // config.php belum disalin — pakai default agar pesan error terbaca sebagai JSON
}
header("Access-Control-Allow-Origin: $origin");
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

foreach (glob(__DIR__ . '/../src/Core/*.php') as $f) require_once $f;
foreach (glob(__DIR__ . '/../src/Support/*.php') as $f) require_once $f;
foreach (glob(__DIR__ . '/../src/Controllers/*.php') as $f) require_once $f;

$router = new Router();

// --- Auth (UC-01, UC-02) ---
$router->on('POST', '/api/auth/register', function () { return AuthController::register(); });
$router->on('POST', '/api/auth/login', function () { return AuthController::login(); });
$router->on('GET', '/api/auth/me', function () { return AuthController::me(); });
$router->on('POST', '/api/auth/logout', function () { return AuthController::logout(); });
$router->on('POST', '/api/auth/forgot-password', function () { return AuthController::forgotPassword(); });
$router->on('POST', '/api/auth/resend-verification', function () { return AuthController::resendVerification(); });
$router->on('POST', '/api/auth/change-password', function () { return AuthController::changePassword(); });

// --- Master cabang (publik) ---
$router->on('GET', '/api/sports', function () { return MiscController::sports(); });

// --- Profil tim (UC-03) ---
$router->on('GET', '/api/teams/me', function () { return TeamController::me(); });
$router->on('PUT', '/api/teams/me', function () { return TeamController::update(); });
$router->on('POST', '/api/teams/me/logo', function () { return TeamController::logo(); });
$router->on('PUT', '/api/users/me', function () { return TeamController::updateAccount(); });
$router->on('GET', '/api/teams/me/stats', function () { return TeamController::stats(); });
$router->on('GET', '/api/teams/me/activities', function () { return TeamController::activities(); });

// --- Matchmaking (UC-04) ---
$router->on('GET', '/api/teams', function () { return MatchmakingController::search(); });
$router->on('GET', '/api/teams/:id', function ($p) { return MatchmakingController::detail($p); });
$router->on('POST', '/api/opponent-requests', function () { return MatchmakingController::send(); });
$router->on('GET', '/api/opponent-requests', function () { return MatchmakingController::list(); });
$router->on('PATCH', '/api/opponent-requests/:id', function ($p) { return MatchmakingController::respond($p); });

// --- Pertandingan (UC-05, UC-06) ---
$router->on('GET', '/api/matches', function () { return MatchController::list(); });
$router->on('GET', '/api/matches/:id', function ($p) { return MatchController::detail($p); });
$router->on('POST', '/api/matches/:id/confirm-schedule', function ($p) { return MatchController::confirmSchedule($p); });
$router->on('POST', '/api/matches/:id/propose', function ($p) { return MatchController::propose($p); });
$router->on('POST', '/api/matches/:id/cancel', function ($p) { return MatchController::cancel($p); });
$router->on('POST', '/api/matches/:id/result', function ($p) { return MatchController::submitResult($p); });
$router->on('POST', '/api/matches/:id/result/confirm', function ($p) { return MatchController::confirmResult($p); });
$router->on('POST', '/api/matches/:id/result/dispute', function ($p) { return MatchController::disputeResult($p); });

// --- Notifikasi (FR-20) ---
$router->on('GET', '/api/notifications', function () { return MiscController::notifications(); });
$router->on('PATCH', '/api/notifications/:id/read', function ($p) { return MiscController::readNotification($p); });
$router->on('POST', '/api/notifications/read-all', function () { return MiscController::readAll(); });

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
$router->dispatch($method, $uri);
