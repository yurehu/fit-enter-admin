/**
 * 入力バリデーション・サニタイズユーティリティ
 */

/**
 * 文字列をサニタイズ（先頭末尾の空白除去 + HTMLタグ除去）
 */
export function sanitizeString(input: unknown): string {
    if (typeof input !== "string") return "";
    return input
        .trim()
        .replace(/[<>]/g, "") // HTMLタグの基本的なエスケープ
        .slice(0, 500); // 文字数制限
}

/**
 * メールアドレスの形式チェック
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
}

/**
 * 学年の妥当性チェック
 */
const VALID_GRADES = [
    "小1", "小2", "小3", "小4", "小5", "小6",
    "中1", "中2", "中3",
    "高1", "高2", "高3",
    "その他",
];

export function validateGrade(grade: string): boolean {
    return VALID_GRADES.includes(grade);
}

/**
 * 名前のバリデーション（1〜50文字）
 */
export function validateName(name: string): boolean {
    return name.length >= 1 && name.length <= 50;
}

/**
 * パスワード強度チェック（最低8文字）
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
    if (password.length < 8) {
        return { valid: false, message: "パスワードは8文字以上で設定してください" };
    }
    if (password.length > 128) {
        return { valid: false, message: "パスワードは128文字以下で設定してください" };
    }
    return { valid: true };
}

/**
 * 時刻フォーマットの検証（HH:mm 形式）
 */
export function validateTimeFormat(time: string): boolean {
    return /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
}

/**
 * 日付フォーマットの検証（YYYY-MM-DD 形式）
 */
export function validateDateFormat(date: string): boolean {
    return /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/.test(date);
}

/**
 * IDフォーマットの検証（cuid形式の簡易チェック）
 */
export function validateId(id: string): boolean {
    return /^[a-z0-9]{20,30}$/.test(id);
}
