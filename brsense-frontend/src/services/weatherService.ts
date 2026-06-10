import type { DailyForecast } from "../types";

export const fetchWeatherData = async (lat: number, lng: number): Promise<DailyForecast[]> => {
    // URL atualizada com et0_fao_evapotranspiration
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,et0_fao_evapotranspiration&timezone=America%2FSao_Paulo&forecast_days=14`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error('Falha ao buscar dados meteorológicos');
    
    const data = await res.json();
    
    // 👇 ADICIONE ESTA LINHA PARA VERIFICAR
    console.log("DADOS DA API:", data.daily);

    return data.daily.time.map((timeStr: string, index: number) => {
        const dateObj = new Date(timeStr + 'T12:00:00Z');
        
        return {
            date: timeStr,
            dayName: dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
            dayNumber: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            tempMin: data.daily.temperature_2m_min[index],
            tempMax: data.daily.temperature_2m_max[index],
            precipProb: data.daily.precipitation_probability_max[index],
            precipSum: data.daily.precipitation_sum[index],
            tempRange: [
                data.daily.temperature_2m_min[index], 
                data.daily.temperature_2m_max[index]
            ],
            // Mapeando a evapotranspiração
            et0: data.daily.et0_fao_evapotranspiration[index]
        };
    });
};