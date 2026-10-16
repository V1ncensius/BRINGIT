<?php
// Notifikasi dalam aplikasi (FR-20).
class Notifier
{
    public static function toUser($userId, $message, $link = '')
    {
        Database::run(
            'INSERT INTO notifications (user_id, message, link, created_at) VALUES (?,?,?,NOW())',
            [(int) $userId, $message, $link]
        );
    }

    public static function toTeam($teamId, $message, $link = '')
    {
        $t = Database::one('SELECT user_id FROM teams WHERE id = ?', [(int) $teamId]);
        if ($t) self::toUser($t['user_id'], $message, $link);
    }
}
