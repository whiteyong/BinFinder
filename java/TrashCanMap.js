// // TrashCanMap.js
// import { MAP_CENTER, CSV_FILE_PATH, MAX_MARKERS } from './config.js';
// import { initMap, geocodeWithSdk } from './mapService.js';
// import { showLoading, updateCountDisplay, createOption } from './domUtils.js';

// export class TrashCanMap {
//     constructor() {
//         this.map = null;
//         this.markers = [];
//         this.trashCanData = [];
//         this.currentFilter = 'all';
//         this.currentDistrict = 'all';

//         // DOM Elements
//         this.cacheDOMElements();
//         this.init();
//     }

//     cacheDOMElements() {
//         this.menuButton = document.getElementById('menuButton');
//         this.closeMenu = document.getElementById('closeMenu');
//         this.sideMenu = document.getElementById('sideMenu');
//         this.menuOverlay = document.getElementById('menuOverlay');
//         this.locationDetail = document.getElementById('locationDetail');
//         this.closeDetail = document.getElementById('closeDetail');
//         this.searchInput = document.getElementById('searchInput');
//         this.searchButton = document.getElementById('searchButton');
//         this.filterButtons = document.querySelectorAll('.filter-button');
//         this.districtFilter = document.getElementById('districtFilter');
//         this.loadingIndicator = document.getElementById('loadingIndicator');
//         this.totalCount = document.getElementById('totalCount');
//         this.visibleCount = document.getElementById('visibleCount');

//         this.locationTitle = document.getElementById('locationTitle');
//         this.locationAddress = document.getElementById('locationAddress');
//         this.locationDetailAddress = document.getElementById('locationDetailAddress');
//         this.locationType = document.getElementById('locationType');
//         this.trashType = document.getElementById('trashType');
//         this.directionButton = document.getElementById('directionButton');
//     }

//     init() {
//         this.map = initMap();
//         this.loadCSVFromLocalFile();
//         this.attachUIEvents();
//     }

//     updateVisibleMarkers() {
//         const visible = this.markers.filter(m => m.visible).length;
//         updateCountDisplay(this.visibleCount, visible, '화면에');
//     }

//     clearMarkers() {
//         this.markers.forEach(m => m.marker.setMap(null));
//         this.markers = [];
//     }

//     showLocationDetails(item, coords) {
//         this.locationTitle.textContent = item['세부 위치'] || '위치 정보';
//         this.locationAddress.textContent = item['도로명 주소'] || '정보 없음';
//         this.locationDetailAddress.textContent = item['세부 위치'] || '정보 없음';
//         this.locationType.textContent = item['설치 장소 유형'] || '정보 없음';
//         this.trashType.textContent = item['수거 쓰레기 종류'] || '정보 없음';

//         this.directionButton.onclick = () => {
//             const url = `https://map.naver.com/v5/directions/-/-/-/transit?c=${coords.lng()},${coords.lat()},15,0,0,0,dh`;
//             window.open(url, '_blank');
//         };

//         this.locationDetail.classList.add('show');
//     }

//     parseCSVRow(row) {
//         const result = [];
//         let insideQuotes = false, current = '';
//         for (let i = 0; i < row.length; i++) {
//             const c = row[i];
//             if (c === '"') insideQuotes = !insideQuotes;
//             else if (c === ',' && !insideQuotes) { result.push(current); current = ''; }
//             else current += c;
//         }
//         result.push(current);
//         return result;
//     }

//     populateDistrictFilter(districts) {
//         this.districtFilter.innerHTML = '';
//         this.districtFilter.appendChild(createOption('all', '전체 구'));
//         districts.forEach(d => this.districtFilter.appendChild(createOption(d, d)));
//     }

//     parseCSVAndLoadData(csvText) {
//         const rows = csvText.split('\n');
//         const headers = rows[0].split(',');
//         const data = [], districts = new Set();

//         for (let i = 1; i < rows.length; i++) {
//             if (!rows[i].trim()) continue;
//             const values = this.parseCSVRow(rows[i]);
//             if (values.length < headers.length) continue;
//             const item = {};
//             headers.forEach((h, j) => item[h.trim()] = values[j]?.trim());
//             if (item['구']) districts.add(item['구']);
//             data.push(item);
//         }

//         this.trashCanData = data;
//         updateCountDisplay(this.totalCount, data.length, '총');
//         this.populateDistrictFilter(Array.from(districts).sort());
//         this.createGeocodedMarkers();
//     }

//     async loadCSVFromLocalFile() {
//         try {
//             showLoading(this.loadingIndicator, true);
//             const response = await fetch(CSV_FILE_PATH);
//             const text = await response.text();
//             this.parseCSVAndLoadData(text);
//         } catch (err) {
//             console.error('CSV 로드 오류:', err);
//             alert('CSV 파일을 불러오지 못했습니다.');
//         } finally {
//             showLoading(this.loadingIndicator, false);
//         }
//     }

//     createGeocodedMarkers() {
//         this.clearMarkers();
//         const limited = this.trashCanData.slice(0, MAX_MARKERS);
//         limited.forEach((item, index) => {
//             const addr = item['도로명 주소']?.trim();
//             if (!addr || addr === '없음') return;
//             geocodeWithSdk(addr, coords => {
//                 if (!coords) return;
//                 const type = item['수거 쓰레기 종류'] || '';
//                 const markerType = type.includes('일반') ? 'trashcan' : type.includes('재활용') ? 'seperatecan' : 'general';

//                 const marker = new naver.maps.Marker({
//                     position: coords,
//                     map: this.map,
//                     icon: {
//                         content: `<div class="marker ${markerType}"></div>`
//                     }
//                 });

//                 naver.maps.Event.addListener(marker, 'click', () => this.showLocationDetails(item, coords));
//                 this.markers.push({ marker, data: item, type: markerType, visible: true });
//                 this.updateVisibleMarkers();
//             });
//         });
//     }

//     attachUIEvents() {
//         this.menuButton?.addEventListener('click', () => this.sideMenu.classList.add('show'));
//         this.closeMenu?.addEventListener('click', () => this.sideMenu.classList.remove('show'));
//         this.menuOverlay?.addEventListener('click', () => this.sideMenu.classList.remove('show'));
//         this.closeDetail?.addEventListener('click', () => this.locationDetail.classList.remove('show'));

//         this.searchButton?.addEventListener('click', () => this.filterMarkers());
//         this.searchInput?.addEventListener('keyup', e => e.key === 'Enter' && this.filterMarkers());
//         this.districtFilter?.addEventListener('change', () => {
//             this.currentDistrict = this.districtFilter.value;
//             this.filterMarkers();
//         });
//     }

//     filterMarkers() {
//         const text = this.searchInput.value.toLowerCase();
//         this.markers.forEach(m => {
//             let visible = true;
//             const type = m.data['수거 쓰레기 종류'] || '';
//             if (this.currentFilter !== 'all') visible = type.includes(this.currentFilter);
//             if (visible && this.currentDistrict !== 'all') visible = m.data['구'] === this.currentDistrict;
//             if (visible && text) {
//                 const addr = m.data['도로명 주소']?.toLowerCase() || '';
//                 const detail = m.data['세부 위치']?.toLowerCase() || '';
//                 visible = addr.includes(text) || detail.includes(text);
//             }
//             m.visible = visible;
//             m.marker.setMap(visible ? this.map : null);
//         });
//         this.updateVisibleMarkers();
//     }
// }
