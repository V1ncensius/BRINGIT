<?php
// Lapisan akses database (PDO + prepared statement, anti SQL injection).
class Database
{
    private static $pdo = null;

    public static function pdo()
    {
        if (self::$pdo) return self::$pdo;
        $cfg = require dirname(__DIR__, 2) . '/config.php';
        $db = $cfg['db'];
        $dsn = "mysql:host={$db['host']};port={$db['port']};dbname={$db['name']};charset=utf8mb4";
        self::$pdo = new PDO($dsn, $db['user'], $db['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        self::$pdo->exec("SET time_zone = '+07:00'");
        return self::$pdo;
    }

    public static function run($sql, $params = [])
    {
        $st = self::pdo()->prepare($sql);
        $st->execute($params);
        return $st;
    }

    public static function one($sql, $params = [])
    {
        return self::run($sql, $params)->fetch() ?: null;
    }

    public static function all($sql, $params = [])
    {
        return self::run($sql, $params)->fetchAll();
    }

    public static function lastId()
    {
        return (int) self::pdo()->lastInsertId();
    }
}
