/**
 * MapScreen — Mappa interventi con WebView + Leaflet/OpenStreetMap.
 * Mostra un puntino rosso per ogni intervento con coordinate GPS.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { reportRepository } from '../data/report-repository';

function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return isoDate;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

interface GeoReport {
  id: string;
  lat: number;
  lon: number;
  companyName: string;
  date: string;
}

export default function MapScreen() {
  const [geoReports, setGeoReports] = useState<GeoReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    reportRepository.getAll().then((allReports) => {
      const geo = allReports
        .filter((r) => r.interventionLat != null && r.interventionLon != null)
        .map((r) => ({
          id: r.id,
          lat: r.interventionLat!,
          lon: r.interventionLon!,
          companyName: r.companyName,
          date: formatDate(r.interventionDate),
        }));
      setGeoReports(geo);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));
  }, []);

  const mapHtml = useMemo(() => {
    if (geoReports.length === 0) return '';

    const markersJson = JSON.stringify(
      geoReports.map((r) => ({
        lat: r.lat,
        lon: r.lon,
        title: r.companyName,
        date: r.date,
      }))
    );

    const lats = geoReports.map((r) => r.lat);
    const lons = geoReports.map((r) => r.lon);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLon = (Math.min(...lons) + Math.max(...lons)) / 2;

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0,user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;width:100%;margin:0;padding:0;}</style>
</head>
<body>
<div id="map"></div>
<script>
var markers=${markersJson};
var map=L.map('map').setView([${centerLat},${centerLon}],10);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{
  attribution:'OpenStreetMap'
}).addTo(map);
var bounds=[];
markers.forEach(function(m){
  var icon=L.icon({
    iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize:[25,41],iconAnchor:[12,41],popupAnchor:[1,-34]
  });
  L.marker([m.lat,m.lon],{icon:icon}).addTo(map).bindPopup('<b>'+m.title+'</b><br>'+m.date);
  bounds.push([m.lat,m.lon]);
});
if(bounds.length>1){map.fitBounds(bounds,{padding:[40,40]});}
else if(bounds.length===1){map.setView(bounds[0],13);}
</script>
</body>
</html>`;
  }, [geoReports]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Caricamento mappa...</Text>
      </View>
    );
  }

  if (geoReports.length === 0) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium" style={{ textAlign: 'center' }}>
          Nessun intervento con posizione GPS
        </Text>
        <Text variant="bodyMedium" style={{ color: '#666', marginTop: 8, textAlign: 'center' }}>
          Usa "📍 Rileva GPS" nel form per salvare le coordinate.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ html: mapHtml }}
        style={styles.map}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
});
