-- ============================================================
-- BRINGIT — Skema database progres 30% (UC-01 s.d. UC-06, FR-20)
-- Collation: utf8mb4_unicode_ci. Zona waktu backend: WIB.
-- Mengimpor ulang file ini akan MENGHAPUS semua data (DROP TABLE).
-- ============================================================
SET NAMES utf8mb4;
SET time_zone = '+07:00';

DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS disputes;
DROP TABLE IF EXISTS match_results;
DROP TABLE IF EXISTS matches;
DROP TABLE IF EXISTS opponent_requests;
DROP TABLE IF EXISTS team_players;
DROP TABLE IF EXISTS team_sports;
DROP TABLE IF EXISTS elo_ratings;
DROP TABLE IF EXISTS teams;
DROP TABLE IF EXISTS sport_categories;
DROP TABLE IF EXISTS users;

-- ---------- Akun (FR-01) ----------
CREATE TABLE users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL DEFAULT '',
    role ENUM('team','referee','photographer','admin') NOT NULL DEFAULT 'team',
    status ENUM('verified','pending','rejected') NOT NULL DEFAULT 'verified',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Master cabang olahraga (FR-26 disiapkan) ----------
CREATE TABLE sport_categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    active TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO sport_categories (id, name, active) VALUES
    (1, 'Futsal', 1),
    (2, 'Basket', 1),
    (3, 'Tenis', 1),
    (4, 'Padel', 1),
    (5, 'Bulu Tangkis', 1),
    (6, 'Mini Soccer', 1);

-- ---------- Profil tim (FR-02; kolom [+] revisi kecil ERD, lihat panduan 4.3) ----------
CREATE TABLE teams (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL UNIQUE,
    team_name VARCHAR(100) NOT NULL,
    logo MEDIUMTEXT NULL,
    city VARCHAR(50) NOT NULL DEFAULT 'Bandung',
    area VARCHAR(100) NOT NULL DEFAULT '',
    level ENUM('Pemula','Menengah','Mahir') NOT NULL DEFAULT 'Pemula',
    players INT NOT NULL DEFAULT 0,
    venue VARCHAR(150) NOT NULL DEFAULT '',
    schedule VARCHAR(150) NOT NULL DEFAULT '',
    about TEXT NOT NULL DEFAULT '',
    primary_sport_id INT UNSIGNED NOT NULL DEFAULT 1,
    verified TINYINT(1) NOT NULL DEFAULT 1,
    joined DATE NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_teams_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_teams_primary_sport FOREIGN KEY (primary_sport_id) REFERENCES sport_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Relasi banyak-ke-banyak tim <-> cabang
CREATE TABLE team_sports (
    team_id INT UNSIGNED NOT NULL,
    sport_category_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (team_id, sport_category_id),
    CONSTRAINT fk_ts_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_ts_sport FOREIGN KEY (sport_category_id) REFERENCES sport_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Daftar pemain (FR-02 menyebut "daftar pemain")
CREATE TABLE team_players (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    team_id INT UNSIGNED NOT NULL,
    name VARCHAR(100) NOT NULL,
    position VARCHAR(50) NOT NULL DEFAULT '',
    number INT NULL,
    CONSTRAINT fk_tp_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Undangan sparring (UC-04; kolom [+] usulan jadwal, panduan 4.3) ----------
CREATE TABLE opponent_requests (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    from_team_id INT UNSIGNED NOT NULL,
    to_team_id INT UNSIGNED NOT NULL,
    sport_category_id INT UNSIGNED NOT NULL,
    status ENUM('pending','accepted','rejected','cancelled','expired') NOT NULL DEFAULT 'pending',
    proposed_date DATE NOT NULL,
    proposed_time VARCHAR(10) NOT NULL,
    duration INT NOT NULL DEFAULT 60,
    location VARCHAR(200) NOT NULL,
    note VARCHAR(255) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_or_to (to_team_id, status),
    INDEX idx_or_from (from_team_id, status),
    CONSTRAINT fk_or_from FOREIGN KEY (from_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_or_to FOREIGN KEY (to_team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_or_sport FOREIGN KEY (sport_category_id) REFERENCES sport_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Jadwal pertandingan (UC-05; kolom proposal_* = ajukan perubahan jadwal) ----------
CREATE TABLE matches (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    request_id INT UNSIGNED NULL,
    team_a_id INT UNSIGNED NOT NULL,
    team_b_id INT UNSIGNED NOT NULL,
    sport_category_id INT UNSIGNED NOT NULL,
    level VARCHAR(20) NOT NULL DEFAULT '',
    match_date DATE NOT NULL,
    match_time VARCHAR(10) NOT NULL,
    duration INT NOT NULL DEFAULT 60,
    location VARCHAR(200) NOT NULL,
    status ENUM('proposed','scheduled','result_pending','final','disputed','cancelled') NOT NULL DEFAULT 'scheduled',
    proposal_by_team_id INT UNSIGNED NULL,
    proposal_date DATE NULL,
    proposal_time VARCHAR(10) NULL,
    proposal_duration INT NULL,
    proposal_location VARCHAR(200) NULL,
    proposal_note VARCHAR(255) NULL,
    proposal_created_at DATETIME NULL,
    INDEX idx_m_team_a (team_a_id, status),
    INDEX idx_m_team_b (team_b_id, status),
    CONSTRAINT fk_m_team_a FOREIGN KEY (team_a_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_m_team_b FOREIGN KEY (team_b_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_m_sport FOREIGN KEY (sport_category_id) REFERENCES sport_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Hasil: laporan tiap tim + konfirmasi dua pihak (FR-07/FR-08) ----------
CREATE TABLE match_results (
    match_id INT UNSIGNED PRIMARY KEY,
    status ENUM('pending','final','disputed') NOT NULL DEFAULT 'pending',
    score_a INT NULL,
    score_b INT NULL,
    report_a_score_a INT NULL,
    report_a_score_b INT NULL,
    report_a_note VARCHAR(255) NOT NULL DEFAULT '',
    report_a_at DATETIME NULL,
    report_b_score_a INT NULL,
    report_b_score_b INT NULL,
    report_b_note VARCHAR(255) NOT NULL DEFAULT '',
    report_b_at DATETIME NULL,
    confirmed_by_a TINYINT(1) NOT NULL DEFAULT 0,
    confirmed_by_b TINYINT(1) NOT NULL DEFAULT 0,
    CONSTRAINT fk_mr_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Sengketa hasil (keputusan admin menyusul di progres berikutnya) ----------
CREATE TABLE disputes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    match_id INT UNSIGNED NOT NULL,
    description TEXT NOT NULL,
    status ENUM('open','resolved') NOT NULL DEFAULT 'open',
    resolved_by_admin_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_d_match FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Notifikasi dalam aplikasi (FR-20) ----------
CREATE TABLE notifications (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNSIGNED NOT NULL,
    message VARCHAR(255) NOT NULL,
    link VARCHAR(150) NOT NULL DEFAULT '',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_n_user (user_id, is_read),
    CONSTRAINT fk_n_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- ELO (disiapkan; perhitungan ELO progres berikutnya) ----------
CREATE TABLE elo_ratings (
    team_id INT UNSIGNED NOT NULL,
    sport_category_id INT UNSIGNED NOT NULL,
    rating INT NOT NULL DEFAULT 1000,
    updated_at DATE NOT NULL,
    PRIMARY KEY (team_id, sport_category_id),
    CONSTRAINT fk_elo_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    CONSTRAINT fk_elo_sport FOREIGN KEY (sport_category_id) REFERENCES sport_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
