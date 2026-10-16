<?php
// Router REST minimal: mencocokkan METHOD + pola path berisi :param.
class Router
{
    private $routes = [];

    public function on($method, $pattern, $handler)
    {
        $keys = [];
        $re = '#^' . preg_replace_callback('/:(\w+)/', function ($m) use (&$keys) {
            $keys[] = $m[1];
            return '([^/]+)';
        }, $pattern) . '$#';
        $this->routes[] = [$method, $re, $keys, $handler];
    }

    public function dispatch($method, $path)
    {
        if ($method === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
        // PHP built-in server tidak meneruskan PATCH/PUT/DELETE asli? -> tetap didukung.
        foreach ($this->routes as [$m, $re, $keys, $handler]) {
            if ($m !== $method) continue;
            if (!preg_match($re, $path, $matches)) continue;
            $params = [];
            foreach ($keys as $i => $k) $params[$k] = urldecode($matches[$i + 1]);
            $out = call_user_func($handler, $params);
            Http::json($out ?? null);
        }
        Http::fail(404, 'Endpoint tidak ditemukan.');
    }
}
