<?php
// Master cabang olahraga + notifikasi (FR-20).
class MiscController
{
    public static function sports()
    {
        $all = isset($_GET['all']) && $_GET['all'];
        $rows = Database::all(
            $all ? 'SELECT * FROM sport_categories ORDER BY id' : 'SELECT * FROM sport_categories WHERE active = 1 ORDER BY id'
        );
        return array_map(function ($s) {
            return ['id' => (int) $s['id'], 'name' => $s['name'], 'active' => (bool) $s['active']];
        }, $rows);
    }

    public static function notifications()
    {
        $u = Auth::require();
        $rows = Database::all(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 20',
            [$u['id']]
        );
        return array_map(function ($n) {
            return [
                'id' => (int) $n['id'],
                'user_id' => (int) $n['user_id'],
                'message' => $n['message'],
                'link' => $n['link'],
                'is_read' => (bool) $n['is_read'],
                'created_at' => $n['created_at'],
            ];
        }, $rows);
    }

    public static function readNotification($params)
    {
        $u = Auth::require();
        Database::run('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?', [(int) $params['id'], $u['id']]);
        return ['ok' => true];
    }

    public static function readAll()
    {
        $u = Auth::require();
        Database::run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [$u['id']]);
        return ['ok' => true];
    }
}
