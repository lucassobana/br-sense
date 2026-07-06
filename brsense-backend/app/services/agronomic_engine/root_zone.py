from datetime import datetime
from collections import defaultdict

def determine_active_root_zone(readings: list, delta_threshold: float = 0.5) -> str:
    if not readings:
        return "10 cm"

    days_data = defaultdict(list)
    for r in readings:
        date_str = r.time.strftime('%Y-%m-%d')
        days_data[date_str].append(r)

    active_layers = set()
    layer_mapping = {1: 'moisture_1', 2: 'moisture_2', 3: 'moisture_3', 4: 'moisture_4'}
    depths = {1: 10, 2: 20, 3: 30, 4: 40}

    for day_readings in days_data.items():
        morning = [r for r in day_readings if 5 <= r.time.hour <= 8]
        evening = [r for r in day_readings if 16 <= r.time.hour <= 19]

        if not morning or not evening:
            continue

        m_read = morning[-1]
        e_read = evening[0]

        for level, attr in layer_mapping.items():
            m_val = getattr(m_read, attr, None)
            e_val = getattr(e_read, attr, None)
            
            if m_val is not None and e_val is not None:
                if (m_val - e_val) >= delta_threshold:
                    active_layers.add(depths[level])

    if not active_layers:
        return "10 cm"
        
    layers = sorted(list(active_layers))
    if len(layers) == 1:
        return f"{layers[0]} cm"
    elif len(layers) == 2:
        return f"{layers[0]} e {layers[1]} cm"
    else:
        return ", ".join(str(x) for x in layers[:-1]) + f" e {layers[-1]} cm"