"""
FX Freeplay - MetaTrader 5 Python Local IPC Bridge
Communicates via JSON-RPC over stdin/stdout with the Electron main process.
Provides:
  - System capability check (Python, MT5 package, installed terminals)
  - Detection and listing of installed MT5 terminals
  - Connection & launch of selected MT5 terminal
  - Detection of the active MT5 chart
  - Extraction of historical candlestick data directly into a local SQLite database
"""

import sys
import os
import json
import sqlite3
import subprocess
import winreg
from typing import Any, Dict, List, Optional

# UTF-8 stdout setup for Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')

# Check MT5 library import
MT5_AVAILABLE = False
try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
except ImportError:
    mt5 = None

TIMEFRAME_MAP = {
    'M1': 1,
    'M5': 5,
    'M15': 15,
    'M30': 30,
    'H1': 16385,
    'H4': 16388,
    'D1': 16408,
    'W1': 32769,
    'MN1': 49153,
    '1': 1,
    '5': 5,
    '15': 15,
    '30': 30,
    '60': 16385,
    '240': 16388,
    '1440': 16408,
    '10080': 32769,
    '43200': 49153,
}

TIMEFRAME_NAME_MAP = {
    1: 'M1',
    5: 'M5',
    15: 'M15',
    30: 'M30',
    16385: 'H1',
    16388: 'H4',
    16408: 'D1',
    32769: 'W1',
    49153: 'MN1',
}


def get_sqlite_path(custom_path: Optional[str] = None) -> str:
    if custom_path:
        return custom_path
    appdata = os.environ.get('APPDATA', '.')
    dest_dir = os.path.join(appdata, 'FX Freeplay', 'database')
    os.makedirs(dest_dir, exist_ok=True)
    return os.path.join(dest_dir, 'market_data.sqlite')


def init_sqlite_tables(db_path: str):
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS imported_series (
            symbol TEXT,
            timeframe TEXT,
            timestamp INTEGER,
            open REAL,
            high REAL,
            low REAL,
            close REAL,
            volume REAL,
            PRIMARY KEY(symbol, timeframe, timestamp)
        )
    ''')
    cur.execute('''
        CREATE TABLE IF NOT EXISTS symbol_profiles (
            symbol TEXT PRIMARY KEY,
            name TEXT,
            description TEXT,
            digits INTEGER,
            point REAL,
            source TEXT,
            updated_at INTEGER
        )
    ''')
    conn.commit()
    conn.close()


def find_installed_terminals() -> List[Dict[str, str]]:
    """
    Detect MetaTrader 5 installations by:
    1. Reading Windows Registry uninstall keys (HKLM and HKCU under ...\\CurrentVersion\\Uninstall).
    2. Scanning standard installation directories (C:\\Program Files, C:\\Program Files (x86),
       and %LOCALAPPDATA%\\Programs) for terminal64.exe and terminal.exe.
    """
    terminals = []
    seen_paths = set()

    # 1. Check Registry
    roots = [
        (winreg.HKEY_CURRENT_USER, r'Software\Microsoft\Windows\CurrentVersion\Uninstall'),
        (winreg.HKEY_LOCAL_MACHINE, r'Software\Microsoft\Windows\CurrentVersion\Uninstall'),
        (winreg.HKEY_LOCAL_MACHINE, r'Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall'),
    ]
    for hkey, sub in roots:
        try:
            k = winreg.OpenKey(hkey, sub)
            count = winreg.QueryInfoKey(k)[0]
            for i in range(count):
                try:
                    sk_name = winreg.EnumKey(k, i)
                    sk = winreg.OpenKey(k, sk_name)
                    try:
                        dname, _ = winreg.QueryValueEx(sk, 'DisplayName')
                        loc, _ = winreg.QueryValueEx(sk, 'InstallLocation')
                        if ('metatrader' in dname.lower() or 'metaquotes' in dname.lower() or 'mt5' in dname.lower()) and loc:
                            exe = os.path.join(loc, 'terminal64.exe')
                            if not os.path.exists(exe):
                                exe = os.path.join(loc, 'terminal.exe')
                            clean_exe = os.path.normpath(exe)
                            if os.path.exists(clean_exe) and clean_exe.lower() not in seen_paths:
                                seen_paths.add(clean_exe.lower())
                                terminals.append({
                                    'name': dname,
                                    'install_path': loc,
                                    'exe_path': clean_exe,
                                })
                    except WindowsError:
                        pass
                except WindowsError:
                    pass
        except WindowsError:
            pass

    # 2. Disk scan across standard installation directories
    candidate_dirs = [
        r'C:\Program Files',
        r'C:\Program Files (x86)',
        os.path.expandvars(r'%LOCALAPPDATA%\Programs'),
    ]

    for base_dir in candidate_dirs:
        if not os.path.exists(base_dir):
            continue
        try:
            # Check top-level subdirectories for terminal64.exe or terminal.exe
            for folder_name in os.listdir(base_dir):
                folder_path = os.path.join(base_dir, folder_name)
                if not os.path.isdir(folder_path):
                    continue
                for exe_name in ['terminal64.exe', 'terminal.exe']:
                    candidate_exe = os.path.normpath(os.path.join(folder_path, exe_name))
                    if os.path.exists(candidate_exe) and candidate_exe.lower() not in seen_paths:
                        seen_paths.add(candidate_exe.lower())
                        display_name = folder_name
                        if 'metatrader' not in display_name.lower() and 'mt5' not in display_name.lower():
                            display_name = f"{folder_name} (MT5)"
                        terminals.append({
                            'name': display_name,
                            'install_path': folder_path,
                            'exe_path': candidate_exe,
                        })
        except Exception:
            pass

    return terminals


def is_terminal_running(exe_path: Optional[str] = None) -> bool:
    """Check whether terminal64.exe is running."""
    try:
        out = subprocess.check_output(
            ['tasklist', '/FI', 'IMAGENAME eq terminal64.exe', '/FO', 'CSV', '/NH'],
            creationflags=subprocess.CREATE_NO_WINDOW if sys.platform == 'win32' else 0,
        ).decode('utf-8', errors='ignore')
        return 'terminal64.exe' in out.lower()
    except Exception:
        return False


def get_active_chart_info(terminal_exe: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """Inspect MetaQuotes terminal user profile to detect the most active/recent chart."""
    appdata = os.environ.get('APPDATA')
    if not appdata:
        return None
    terminals_base = os.path.join(appdata, 'MetaQuotes', 'Terminal')
    if not os.path.exists(terminals_base):
        return None

    best_time = 0
    best_chart = None

    for entry in os.listdir(terminals_base):
        full = os.path.join(terminals_base, entry)
        if not os.path.isdir(full) or entry in ['Common', 'Community', 'Help']:
            continue
        charts_dir = os.path.join(full, 'MQL5', 'Profiles', 'Charts')
        if not os.path.exists(charts_dir):
            continue

        active_profile = 'Default'
        common_ini = os.path.join(full, 'config', 'common.ini')
        if os.path.exists(common_ini):
            try:
                with open(common_ini, 'r', encoding='utf-16', errors='ignore') as f:
                    for line in f:
                        if line.startswith('ProfileLast='):
                            active_profile = line.strip().split('=', 1)[1]
            except Exception:
                pass

        target_profile_dir = os.path.join(charts_dir, active_profile)
        if not os.path.exists(target_profile_dir):
            target_profile_dir = os.path.join(charts_dir, 'Default')

        if os.path.exists(target_profile_dir):
            for chr_file in os.listdir(target_profile_dir):
                if chr_file.endswith('.chr'):
                    p = os.path.join(target_profile_dir, chr_file)
                    try:
                        mtime = os.path.getmtime(p)
                        if mtime > best_time:
                            sym, per = None, None
                            with open(p, 'r', encoding='utf-16', errors='ignore') as cf:
                                for l in cf:
                                    l = l.strip()
                                    if l.startswith('symbol='):
                                        sym = l.split('=', 1)[1]
                                    elif l.startswith('period_size='):
                                        per = l.split('=', 1)[1]
                            if sym:
                                best_time = mtime
                                best_chart = {
                                    'symbol': sym,
                                    'period_size': per or '15',
                                    'timeframe': TIMEFRAME_NAME_MAP.get(int(per or '15'), 'M15'),
                                    'mtime': mtime,
                                    'profile': active_profile,
                                }
                    except Exception:
                        continue

    return best_chart


def check_system() -> Dict[str, Any]:
    """Perform pre-flight capability check."""
    terminals = find_installed_terminals()
    return {
        'python_installed': True,
        'python_version': sys.version.split(' ')[0],
        'mt5_package_installed': MT5_AVAILABLE,
        'terminals_count': len(terminals),
        'terminals': terminals,
        'terminal_running': is_terminal_running(),
    }


# Timeframe specs for complete symbol dataset extraction
STANDARD_TIMEFRAME_SPECS = [
    ('1m', 1, 50000),
    ('5m', 5, 30000),
    ('15m', 15, 20000),
    ('30m', 30, 15000),
    ('1h', 16385, 10000),
    ('4h', 16388, 5000),
    ('D', 16408, 3000),
]


def sync_active_chart(terminal_path: Optional[str] = None, bar_count: int = 50000, db_path: Optional[str] = None) -> Dict[str, Any]:
    """Initialize connection to MT5, fetch active chart symbol candles across all timeframes, and store in SQLite."""
    if not MT5_AVAILABLE:
        return {'success': False, 'error': 'MetaTrader5 python package is not installed.'}

    # Initialize MT5 terminal
    init_args = {}
    if terminal_path and os.path.exists(terminal_path):
        init_args['path'] = terminal_path

    if not mt5.initialize(**init_args):
        err = mt5.last_error()
        return {'success': False, 'error': f'MT5 initialization failed: {err}'}

    try:
        active_chart = get_active_chart_info(terminal_path)
        symbol = active_chart['symbol'] if active_chart else 'EURUSD'
        active_period_size = active_chart.get('period_size', '15') if active_chart else '15'
        
        # Normalize active timeframe key for frontend
        period_to_tf = {
            '1': '1m',
            '5': '5m',
            '15': '15m',
            '30': '30m',
            '60': '1h',
            '240': '4h',
            '1440': 'D',
            '10080': 'W',
            '43200': 'M',
        }
        active_tf = period_to_tf.get(str(active_period_size), '15m')

        # Ensure symbol is selected in Market Watch
        mt5.symbol_select(symbol, True)
        s_info = mt5.symbol_info(symbol)

        target_db = get_sqlite_path(db_path)
        init_sqlite_tables(target_db)

        conn = sqlite3.connect(target_db)
        cur = conn.cursor()

        # Insert / Update symbol profile
        digits = s_info.digits if s_info else 5
        point = s_info.point if s_info else 0.00001
        description = s_info.description or s_info.name if s_info else symbol

        if s_info:
            cur.execute('''
                INSERT OR REPLACE INTO symbol_profiles (symbol, name, description, digits, point, source, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, unixepoch())
            ''', (
                symbol,
                s_info.name,
                description,
                digits,
                point,
                'MT5_AUTO_BRIDGE',
            ))

        timeframes_data = {}
        total_bars_count = 0

        # Extract rates for all standard timeframes
        for tf_name, tf_const, max_bars in STANDARD_TIMEFRAME_SPECS:
            limit = bar_count if tf_name == active_tf else min(bar_count, max_bars)
            rates = mt5.copy_rates_from_pos(symbol, tf_const, 0, limit)
            if rates is not None and len(rates) > 0:
                bars_list = []
                db_rows = []
                for r in rates:
                    timestamp_ms = int(r[0]) * 1000
                    bar_obj = {
                        'timestamp': timestamp_ms,
                        'open': float(r[1]),
                        'high': float(r[2]),
                        'low': float(r[3]),
                        'close': float(r[4]),
                        'volume': float(r[5]),
                    }
                    bars_list.append(bar_obj)
                    db_rows.append((
                        symbol,
                        tf_name,
                        timestamp_ms,
                        float(r[1]),
                        float(r[2]),
                        float(r[3]),
                        float(r[4]),
                        float(r[5]),
                    ))
                
                cur.executemany('''
                    INSERT OR REPLACE INTO imported_series (symbol, timeframe, timestamp, open, high, low, close, volume)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', db_rows)
                
                timeframes_data[tf_name] = bars_list
                total_bars_count += len(bars_list)

        conn.commit()
        conn.close()

        if total_bars_count == 0:
            return {
                'success': False,
                'error': f'No rates available for symbol {symbol}',
                'last_error': str(mt5.last_error()),
            }

        return {
            'success': True,
            'symbol': symbol,
            'active_timeframe': active_tf,
            'total_bars_imported': total_bars_count,
            'db_path': target_db,
            'profile': {
                'symbol': symbol,
                'digits': digits,
                'point': point,
                'description': description,
            },
            'timeframes_data': timeframes_data,
        }

    finally:
        mt5.shutdown()


def handle_request(req: Dict[str, Any]) -> Dict[str, Any]:
    cmd = req.get('cmd')
    params = req.get('params', {})

    if cmd == 'check_system':
        return {'status': 'ok', 'data': check_system()}
    elif cmd == 'list_terminals':
        return {'status': 'ok', 'data': find_installed_terminals()}
    elif cmd == 'get_active_chart':
        chart_info = get_active_chart_info(params.get('terminal_path'))
        return {'status': 'ok', 'data': chart_info}
    elif cmd == 'sync_chart':
        res = sync_active_chart(
            terminal_path=params.get('terminal_path'),
            bar_count=params.get('bar_count', 50000),
            db_path=params.get('db_path'),
        )
        if res.get('success'):
            return {'status': 'ok', 'data': res}
        else:
            return {'status': 'error', 'error': res.get('error')}
    else:
        return {'status': 'error', 'error': f'Unknown command: {cmd}'}


def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--check':
        # One-off command-line check
        print(json.dumps(check_system(), indent=2))
        return

    # Loop reading stdin lines from Electron
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            req_id = req.get('id')
            resp = handle_request(req)
            if req_id is not None:
                resp['id'] = req_id
            sys.stdout.write(json.dumps(resp) + '\n')
            sys.stdout.flush()
        except Exception as e:
            sys.stdout.write(json.dumps({'status': 'error', 'error': str(e)}) + '\n')
            sys.stdout.flush()


if __name__ == '__main__':
    main()
