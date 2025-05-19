// // mapService.js
// import { MAP_CENTER, DEFAULT_ZOOM, ZOOM_CONTROL_POSITION } from './config.js';

// /**
//  * 네이버 지도 초기화
//  * @returns {naver.maps.Map}
//  */
// export function initMap() {
//     const center = new naver.maps.LatLng(MAP_CENTER.lat, MAP_CENTER.lng);
//     return new naver.maps.Map('map', {
//         center,
//         zoom: DEFAULT_ZOOM,
//         zoomControl: true,
//         zoomControlOptions: {
//             position: naver.maps.Position[ZOOM_CONTROL_POSITION]
//         }
//     });
// }

// /**
//  * 네이버 JS SDK 기반 지오코딩 함수 (콜백 방식)
//  * @param {string} address 도로명 주소
//  * @param {function} callback 좌표 반환 콜백
//  */
// export function geocodeWithSdk(address, callback) {
//     if (!window.naver || !naver.maps || !naver.maps.Service) {
//         console.error('❌ 네이버 지도 SDK 또는 지오코더가 로드되지 않았습니다.');
//         callback(null);
//         return;
//     }

//     if (!address || typeof address !== 'string') {
//         console.warn('⚠️ 유효하지 않은 주소:', address);
//         callback(null);
//         return;
//     }

//     naver.maps.Service.geocode({ query: address }, (status, response) => {
//         if (status !== naver.maps.Service.Status.OK) {
//             console.warn(`❌ 지오코딩 실패 (${status}) - 주소: ${address}`);
//             callback(null);
//             return;
//         }

//         const result = response.v2?.addresses?.[0];
//         if (!result) {
//             console.warn(`❌ 좌표 결과 없음 - 주소: ${address}`);
//             callback(null);
//             return;
//         }

//         const coords = new naver.maps.LatLng(result.y, result.x);
//         callback(coords);
//     });
// }
