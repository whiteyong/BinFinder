document.addEventListener('DOMContentLoaded', function () {
    const menuButton = document.getElementById('menuButton');
    const closeMenu = document.getElementById('closeMenu');
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    const locationDetail = document.getElementById('locationDetail');
    const closeDetail = document.getElementById('closeDetail');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const filterButtons = document.querySelectorAll('.filter-button');
    const districtFilter = document.getElementById('districtFilter');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const totalCount = document.getElementById('totalCount');
    const visibleCount = document.getElementById('visibleCount');

    const locationTitle = document.getElementById('locationTitle');
    const locationAddress = document.getElementById('locationAddress');
    const locationDetailAddress = document.getElementById('locationDetailAddress');
    const locationType = document.getElementById('locationType');
    const trashType = document.getElementById('trashType');
    const directionButton = document.getElementById('directionButton');

    let map = null;
    let markers = [];
    let trashCanData = [];
    let currentFilter = 'all';
    let currentDistrict = 'all';
    let visibleMarkers = 0;
    let selectedMarker = null; // 현재 선택된 마커
    let currentInfoWindow = null; // 현재 표시된 정보 창
    let currentLocationMarker = null; // 현재 위치 마커
    let isWatchingLocation = false; // 위치 추적 활성화 여부
    let watchId = null; // 위치 추적 ID
    let boundsChangedListener = null; // 지도 이동 이벤트 리스너
    let selectedMarkerCoords = null; // 선택된 마커 좌표
    let defaultCenter = new naver.maps.LatLng(37.5665, 126.9780); // 서울 중심 좌표(기본값)

    // 현위치 버튼 생성 및 추가
    const currentLocationButton = document.createElement('button');
    currentLocationButton.id = 'currentLocationButton';
    currentLocationButton.className = 'current-location-button';
    currentLocationButton.innerHTML = '<i class="fas fa-crosshairs"></i>';

    function showLoading(show) {
        // 로딩 인디케이터를 항상 숨김 상태로 유지
        if (loadingIndicator) {
            loadingIndicator.style.display = 'none';
        }
    }

    function updateVisibleMarkers() {
        visibleMarkers = markers.filter(marker => marker.visible).length;
        if (visibleCount) {
            visibleCount.textContent = `화면에 ${visibleMarkers}개 표시 중`;
        }
        console.log('✅ 마커 필터링 완료 - 현재 화면 표시 마커:', visibleMarkers);
    }

    // CAPTCHA 기능
    let currentCaptcha = '';
    
    // CAPTCHA 생성 함수
    function generateCaptcha() {
        const captchaElement = document.getElementById('captchaText');
        if (!captchaElement) return;
        
        const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        currentCaptcha = '';
        
        // 6자리 랜덤 문자열 생성
        for (let i = 0; i < 6; i++) {
            const randomIndex = Math.floor(Math.random() * chars.length);
            currentCaptcha += chars[randomIndex];
        }
        
        // CAPTCHA 텍스트 표시 (일부 문자에 랜덤한 회전 적용)
        let captchaDisplay = '';
        for (let i = 0; i < currentCaptcha.length; i++) {
            const rotate = Math.floor(Math.random() * 20) - 10; // -10도에서 10도 사이 랜덤 회전
            captchaDisplay += `<span style="display:inline-block; transform:rotate(${rotate}deg);">${currentCaptcha[i]}</span>`;
        }
        
        captchaElement.innerHTML = captchaDisplay;
        const captchaInput = document.getElementById('captchaInput');
        const captchaError = document.getElementById('captchaError');
        
        if (captchaInput) captchaInput.value = '';
        if (captchaError) captchaError.textContent = '';
    }
    
    // CAPTCHA 검증 함수
    function validateCaptcha() {
        const captchaInput = document.getElementById('captchaInput');
        const errorElement = document.getElementById('captchaError');
        
        if (!captchaInput || !errorElement) return false;
        
        const userInput = captchaInput.value.toUpperCase();
        
        if (userInput === '') {
            errorElement.textContent = '보안문자를 입력해주세요.';
            return false;
        }
        
        if (userInput !== currentCaptcha) {
            errorElement.textContent = '보안문자가 일치하지 않습니다.';
            generateCaptcha(); // 새로운 CAPTCHA 생성
            return false;
        }
        
        errorElement.textContent = '';
        return true;
    }
    
    // CAPTCHA 초기화 함수
    function initCaptcha() {
        // CAPTCHA 생성
        generateCaptcha();
        
        // 새로고침 버튼 이벤트 리스너
        const refreshButton = document.getElementById('refreshCaptcha');
        if (refreshButton) {
            refreshButton.addEventListener('click', function(e) {
                e.preventDefault();
                generateCaptcha();
            });
        }
    }

    // Function to show the location detail panel with a slide-up animation
    function showDetailPanel(item, coords) {
        // Update the detail panel content
        if (locationTitle && locationAddress && locationDetailAddress && locationType && trashType) {
            locationTitle.textContent = item['세부 위치'] || '위치 정보';
            locationAddress.textContent = item['도로명 주소'] || '정보 없음';
            locationDetailAddress.textContent = item['세부 위치'] || '정보 없음';
            locationType.textContent = item['설치 장소 유형'] || '정보 없음';
            trashType.textContent = item['수거 쓰레기 종류'] || '정보 없음';
            
            // 길찾기 버튼 설정
            if (directionButton) {
                directionButton.onclick = function () {
                    const naverMapUrl = `https://map.naver.com/v5/directions/-/-/-/transit?c=${coords.lng()},${coords.lat()},15,0,0,0,dh`;
                    window.open(naverMapUrl, '_blank');
                };
            }
            
            // CAPTCHA 초기화
            initCaptcha();
            
            // 상세 정보 패널 표시 - 슬라이드 업 애니메이션 적용
            if (locationDetail) {
                // 먼저 패널을 화면 아래에 위치시킴
                locationDetail.style.transition = 'none';
                locationDetail.style.transform = 'translateY(100%)';
                locationDetail.style.display = 'block';
                
                // 강제로 리플로우 발생시켜 transition이 적용되도록 함
                void locationDetail.offsetWidth;
                
                // 애니메이션 적용하여 위로 슬라이드
                locationDetail.style.transition = 'transform 0.3s ease-out';
                locationDetail.style.transform = 'translateY(0)';
            }
            
            // 마커 정보창 숨기기
            const infoWindow = document.getElementById('markerInfoWindow');
            if (infoWindow) {
                infoWindow.classList.remove('show');
            }
            
            // 네이버 인포윈도우 닫기 (사용 중인 경우)
            if (selectedMarker && selectedMarker.infoWindow) {
                selectedMarker.infoWindow.close();
            }
        }
    }
    
    // 인포윈도우 내용 생성 함수 수정
    function createInfoWindowContent(item) {
        // 주소 정보 설정
        const district = item['구'] || '';
        const roadAddress = item['도로명 주소'] || '';
        const addressParts = roadAddress.split(' ');
        const shortAddress = addressParts.length > 0 ? addressParts[0] : '';
        
        // 쓰레기통 유형 설정
        const trashTypeText = item['수거 쓰레기 종류'] || '';
        let formattedTrashType = '일반 쓰레기통';
        
        if (trashTypeText.includes('일반쓰레기') && trashTypeText.includes('재활용')) {
            formattedTrashType = 'Trash can, Separate Trash can';
        } else if (trashTypeText.includes('일반쓰레기')) {
            formattedTrashType = 'Trash can';
        } else if (trashTypeText.includes('재활용')) {
            formattedTrashType = 'Separate Trash can';
        }
        
        // 인포윈도우 HTML 생성
        return `
            <div class="custom-info-window">
                <div class="info-window-header">
                    <h3 class="info-window-title">${item['세부 위치'] || '위치 정보'}</h3>
                    <button class="info-window-close">&times;</button>
                </div>
                <div class="info-window-body">
                    <div class="info-window-address">
                        ${district} > ${shortAddress}
                    </div>
                    <div class="info-window-type">
                        ${formattedTrashType}
                    </div>
                </div>
                <div class="info-window-footer">
                    <a href="#" class="info-window-link detail-btn">Detail</a>
                </div>
            </div>
        `;
    }
    
    // 상세 정보 패널 표시 함수
    function showDetailPanel(item, coords) {
        // 기존 상세 정보 패널 내용 업데이트
        if (locationTitle && locationAddress && locationDistance && locationType && trashType) {
            // 주소 정보 조합 (시, 구, 도로명 주소)
            const city = item['시'] ? item['시'] + ' ' : '';
            const district = item['구'] || '';
            const roadAddress = item['도로명 주소'] || '';
            
            // 도로명 주소에서 첫 번째 단어만 추출 (띄어쓰기 전까지)
            const firstPartOfRoadAddress = roadAddress.split(' ')[0];
            
            // 위치 정보 포맷팅 (구 > 도로명 첫 단어)
            const districtAddress = district ? `${district} > ${firstPartOfRoadAddress || '정보 없음'}` : '정보 없음';
            
            const fullAddress = `${city}${district} ${roadAddress}`.trim();
            
            locationTitle.textContent = item['도로명 주소'] || '위치 정보';
            locationAddress.textContent = fullAddress || '정보 없음';
            // locationDetailAddress.textContent = item['세부 위치'] || '정보 없음';  // 세부 위치 항목 주석 처리
            locationType.textContent = item['설치 장소 유형'] || '정보 없음';
            
            // 쓰레기통 유형 포맷팅 (info-window-type과 동일하게)
            const trashTypeText = item['수거 쓰레기 종류'] || '';
            let formattedTrashType = '일반 쓰레기통';
            
            if (trashTypeText.includes('일반쓰레기') && trashTypeText.includes('재활용')) {
                formattedTrashType = 'Trash can, Separate Trash can';
            } else if (trashTypeText.includes('일반쓰레기')) {
                formattedTrashType = 'Trash can';
            } else if (trashTypeText.includes('재활용')) {
                formattedTrashType = 'Separate Trash can';
            }
            
            trashType.textContent = formattedTrashType;
            
            // 위치 정보 업데이트 (구 > 도로명 첫 단어)
            document.getElementById('locationDistrictAddress').textContent = districtAddress;
            
            // 현재 위치와의 거리 계산 및 표시
            if (currentLocationMarker) {
                const currentPos = currentLocationMarker.getPosition();
                const distance = calculateDistance(
                    currentPos.lat(), currentPos.lng(),
                    coords.lat(), coords.lng()
                );
                
                // 거리 포맷팅 (1000m 이상이면 km 단위로 변환)
                let distanceText;
                if (distance >= 1000) {
                    distanceText = (distance / 1000).toFixed(1) + 'km';
                } else {
                    distanceText = Math.round(distance) + 'm';
                }
                
                document.getElementById('locationDistance').textContent = distanceText;
            } else {
                document.getElementById('locationDistance').textContent = '위치 정보 없음';
            }
            
            // 길찾기 버튼 설정
            if (directionButton) {
                directionButton.onclick = function () {
                    const naverMapUrl = `https://map.naver.com/v5/directions/-/-/-/transit?c=${coords.lng()},${coords.lat()},15,0,0,0,dh`;
                    window.open(naverMapUrl, '_blank');
                };
            }
            
            // 상세 정보 패널 표시
            if (locationDetail) {
                locationDetail.classList.add('show');
            }
        }
    }
    
    // 정보 창 위치 업데이트 함수 (네이버 지도 InfoWindow를 사용하므로 이제는 사용하지 않음)
    function updateInfoWindowPosition() {
        // 이 함수는 더 이상 사용되지 않지만, 호출부가 남아있을 수 있으므로 빈 함수로 유지
    }
    
    function clearMarkers() {
        markers.forEach(markerObj => {
            markerObj.marker.setMap(null);
        });
        markers = [];
        console.log('🧹 기존 마커 제거 완료');
    }
    
    function parseCSVRow(row) {
        const result = [];
        let insideQuotes = false;
        let currentValue = '';

        for (let i = 0; i < row.length; i++) {
            const char = row[i];

            if (char === '"') {
                insideQuotes = !insideQuotes;
            } else if (char === ',' && !insideQuotes) {
                result.push(currentValue);
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        result.push(currentValue);
        return result;
    }

    function populateDistrictFilter(districts) {
        if (!districtFilter) return;
        
        districtFilter.innerHTML = '<option value="all">전체 구</option>';
        districts.forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtFilter.appendChild(option);
        });
    }

    function parseCSVAndLoadData(csvText) {
        try {
            console.log('📦 CSV 로딩 시작');
            showLoading(true);
            const rows = csvText.split('\n');
            const headers = rows[0].split(',');
            console.log('📋 헤더 확인:', headers);
    
            const data = [];
            const districts = new Set();
    
            for (let i = 1; i < rows.length; i++) {
                if (!rows[i].trim()) continue;
                const values = parseCSVRow(rows[i]);
                if (values.length < headers.length) continue;
    
                const item = {};
                for (let j = 0; j < headers.length; j++) {
                    item[headers[j].trim()] = values[j].trim();
                }
    
                if (item['구']) {
                    districts.add(item['구']);
                }
    
                data.push(item);
            }
    
            trashCanData = data;
            console.log('✅ CSV 파싱 완료 - 쓰레기통 개수:', trashCanData.length);
            
            if (totalCount) {
                totalCount.textContent = `총 ${data.length}개의 쓰레기통`;
            }
            
            populateDistrictFilter(Array.from(districts).sort());
            
            // 지오코딩 대신 CSV의 위도/경도 데이터를 사용하여 마커 생성
            createMarkersFromCSV();
            
            // 페이지 로드 시 위치 권한 요청
            requestLocationPermission();
        } catch (error) {
            console.error('❌ CSV 파싱 중 오류 발생:', error);
            alert('CSV 파싱에 실패했습니다.');
        } finally {
            showLoading(false);
        }
    }

    function createMarkerElement(markerType) {
        const markerElement = document.createElement('div');
        markerElement.className = `marker ${markerType}`;
        markerElement.style.width = '24px';
        markerElement.style.height = '24px';
        markerElement.style.borderRadius = '50%';
        markerElement.style.border = '2px solid white';
        markerElement.style.backgroundColor = markerType === 'trashcan'
            ? '#188FFF'
            : markerType === 'seperatecan'
            ? '#188FFF'
            : '#188FFF';
        return markerElement;
    }

    async function loadCSVFromLocalFile() {
        try {
            const response = await fetch('./trashCanData.csv');
            const csvText = await response.text();
            parseCSVAndLoadData(csvText);
        } catch (error) {
            console.error('❌ 로컬 CSV 불러오기 실패:', error);
            alert('CSV 파일을 불러오는 데 실패했습니다.');
        }
    }

    function initMap() {
        const mapOptions = {
            center: defaultCenter,
            zoom: 13,
            zoomControl: true,
            zoomControlOptions: {
                position: naver.maps.Position.RIGHT_CENTER
            }
        };
        
        map = new naver.maps.Map('map', mapOptions);
        console.log('🗺 지도 초기화 완료');
        
        // 지도 클릭 이벤트 리스너
        naver.maps.Event.addListener(map, 'click', function() {
            // 선택된 마커의 아이콘 초기화
            if (selectedMarker) {
                selectedMarker.setIcon({
                    url: '/trashcan.svg',
                    size: new naver.maps.Size(30, 40),
                    scaledSize: new naver.maps.Size(30, 40),
                    anchor: new naver.maps.Point(15, 40)
                });
                selectedMarker = null;
                selectedMarkerCoords = null;
            }
            
            // 정보 창 숨기기
            const infoWindow = document.getElementById('markerInfoWindow');
            if (infoWindow) {
                infoWindow.classList.remove('show');
            }
            
            // 상세 정보 패널 숨기기
            if (locationDetail) {
                locationDetail.classList.remove('show');
            }
        });
        
        // 현위치 버튼 추가
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            mapContainer.appendChild(currentLocationButton);
        } else {
            console.error('지도 컨테이너를 찾을 수 없습니다.');
        }
        
        // 마커 개수 업데이트
        naver.maps.Event.addListener(map, 'idle', function() {
            updateVisibleMarkers();
        });
    }
    
    // createGeocodedMarkers 함수를 createMarkersFromCSV 함수로 대체
    function createMarkersFromCSV() {
        clearMarkers();
        const limitedData = trashCanData;
        console.log('📍 마커 생성 시작:', limitedData.length);
        
        limitedData.forEach((item, index) => {
            // CSV에서 위도/경도 값을 직접 가져옴
            const lat = parseFloat(item['Latitude']);
            const lng = parseFloat(item['Longitude']);
            
            // 위도/경도 값이 유효한지 확인
            if (isNaN(lat) || isNaN(lng)) {
                console.warn(`⚠️ 위도/경도 값 누락 (index ${index}):`, item);
                return;
            }
            
            // 네이버 지도 좌표 객체 생성
            const coords = new naver.maps.LatLng(lat, lng);
            
            // 마커 생성
            const marker = new naver.maps.Marker({
                position: coords,
                map: map,
                icon: {
                    url: '/trashcan.svg',
                    size: new naver.maps.Size(30, 40),
                    scaledSize: new naver.maps.Size(30, 40),
                    anchor: new naver.maps.Point(15, 40)
                }
            });
            
            console.log(`✅ 마커 생성 완료 (index ${index}):`, item['세부 위치'] || item['도로명 주소']);
            
            // 인포윈도우 생성
            const infoWindow = new naver.maps.InfoWindow({
                content: '',
                borderWidth: 0,
                backgroundColor: 'transparent',
                disableAnchor: true,
                pixelOffset: new naver.maps.Point(0, -10)
            });
            
            // 마커 클릭 이벤트 리스너
            naver.maps.Event.addListener(marker, 'click', function (e) {
                // 이벤트 전파 중지
                if (e && e.domEvent) {
                    e.domEvent.stopPropagation();
                    e.domEvent.preventDefault();
                }
                
                console.log('마커 클릭됨:', item['세부 위치']);
                
                // 현재 클릭한 마커가 이미 선택된 마커인 경우 (토글 동작)
                if (selectedMarker === marker) {
                    // 아이콘을 기본으로 되돌리고 인포윈도우 닫기
                    marker.setIcon({
                        url: '/trashcan.svg',
                        size: new naver.maps.Size(30, 40),
                        scaledSize: new naver.maps.Size(30, 40),
                        anchor: new naver.maps.Point(15, 40)
                    });
                    infoWindow.close();
                    selectedMarker = null;
                    return;
                }
                
                // 이전에 선택된 마커가 있는 경우 초기화
                if (selectedMarker) {
                    selectedMarker.setIcon({
                        url: '/trashcan.svg',
                        size: new naver.maps.Size(30, 40),
                        scaledSize: new naver.maps.Size(30, 40),
                        anchor: new naver.maps.Point(15, 40)
                    });
                    
                    // 이전 인포윈도우 닫기
                    if (selectedMarker.infoWindow) {
                        selectedMarker.infoWindow.close();
                    }
                    
                    // 상세 정보 패널 닫기
                    if (locationDetail) {
                        locationDetail.classList.remove('show');
                    }
                }
                
                // 클릭된 마커를 상세 아이콘으로 변경
                marker.setIcon({
                    url: './trashcan_detailed.svg',
                    size: new naver.maps.Size(30, 40),
                    scaledSize: new naver.maps.Size(30, 40),
                    anchor: new naver.maps.Point(15, 40)
                });
                
                selectedMarker = marker;
                selectedMarkerCoords = coords;
                
                // 지도 이동
                map.setCenter(coords);
                
                // 인포윈도우 내용 생성
                const content = createInfoWindowContent(item);
                infoWindow.setContent(content);
                
                // 인포윈도우 열기
                infoWindow.open(map, marker);
                
                // 마커에 인포윈도우 참조 저장
                marker.infoWindow = infoWindow;
                
                // 인포윈도우가 DOM에 추가된 후에 이벤트 리스너를 추가하기 위해 약간의 지연을 둠
                setTimeout(() => {
                    // 닫기 버튼 이벤트 리스너 추가
                    const closeButton = document.querySelector('.info-window-close');
                    if (closeButton) {
                        closeButton.onclick = function(e) {
                            e.stopPropagation();
                            infoWindow.close();
                            // 마커 z-index 복구
                            marker.setZIndex(0);
                        };
                    }
                    
                    // 상세보기 링크 클릭 이벤트
                    const detailLink = document.querySelector('.detail-btn');
                    if (detailLink) {
                        detailLink.onclick = function(e) {
                            e.preventDefault();
                            e.stopPropagation();
                            
                            // 인포윈도우 먼저 닫기
                            infoWindow.close();
                            
                            // 약간의 지연 후에 상세 패널 표시 (애니메이션을 위해)
                            setTimeout(() => {
                                // 상세 정보 패널 표시
                                showDetailPanel(item, coords);
                                
                                // 상세 패널이 화면에 표시되도록 강제 리플로우 발생
                                const panel = document.querySelector('.location-detail');
                                if (panel) {
                                    panel.style.display = 'block';
                                    void panel.offsetHeight; // 강제 리플로우
                                    panel.style.transform = 'translateY(0)';
                                }
                            }, 50);
                            
                            return false;
                        };
                    }
                }, 100);
            });
            
            // 마커에 인포윈도우 참조 저장
            marker.infoWindow = infoWindow;
            
            // 마커 객체를 배열에 추가
            markers.push({
                marker: marker,
                data: item,
                type: 'trashcan',
                visible: true
            });
        });
        
        // 마커 개수 업데이트
        updateVisibleMarkers();
        console.log('✅ 총 마커 생성 완료:', markers.length);
    }

    // 페이지 로드 시 위치 권한 요청 함수
    function requestLocationPermission() {
        // 브라우저가 geolocation API를 지원하는지 확인
        if (navigator.geolocation) {
            // 브라우저 기본 위치 권한 요청 UI 사용
            navigator.geolocation.getCurrentPosition(
                // 성공 콜백
                function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const currentPos = new naver.maps.LatLng(lat, lng); // 여기서 lat, lng 사용

                    // 지도 이동
                    map.setCenter(currentPos);
                    map.setZoom(16);

                    // 현위치 마커 생성
                    createCurrentLocationMarker(currentPos, position.coords.accuracy);

                    // 근처 쓰레기통 개수 업데이트
                    updateNearbyTrashCount();

                    console.log('✅ 위치 권한 허용됨, 현재 위치:', lat, lng);
                },
                // 오류 콜백
                function(error) {
                    console.log('❌ 위치 권한 거부됨 또는 오류 발생:', error.code);
                    
                    // 위치 권한이 거부되었거나 오류가 발생한 경우 기본 위치 사용
                    map.setCenter(defaultCenter);
                    map.setZoom(13);
                    
                    // 오류 코드에 따른 처리
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            console.log('사용자가 위치 정보 제공을 거부했습니다.');
                            break;
                        case error.POSITION_UNAVAILABLE:
                            console.log('위치 정보를 사용할 수 없습니다.');
                            break;
                        case error.TIMEOUT:
                            console.log('위치 정보 요청 시간이 초과되었습니다.');
                            break;
                        case error.UNKNOWN_ERROR:
                            console.log('알 수 없는 오류가 발생했습니다.');
                            break;
                    }
                },
                // 옵션
                {
                    enableHighAccuracy: true, // 높은 정확도 요청
                    timeout: 10000,           // 10초 타임아웃
                    maximumAge: 0             // 캐시된 위치 정보를 사용하지 않음
                }
            );
        } else {
            // geolocation API를 지원하지 않는 브라우저
            console.log('❌ 이 브라우저는 위치 정보를 지원하지 않습니다.');
            map.setCenter(defaultCenter);
            map.setZoom(13);
        }
    }
    
    // 현위치 마커 생성 함수
    function createCurrentLocationMarker(position, accuracy) {
        // 이미 현위치 마커가 있으면 제거
        if (currentLocationMarker !== null) {
            if (currentLocationMarker.accuracyCircle) {
                currentLocationMarker.accuracyCircle.setMap(null);
            }
            currentLocationMarker.setMap(null);
        }
        
        // 현위치 마커 생성
        currentLocationMarker = new naver.maps.Marker({
            position: position,
            map: map,
            icon: {
                content: '<div style="width: 20px; height: 20px; background-color: #188FFF; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>',
                anchor: new naver.maps.Point(10, 10)
            },
            zIndex: 1000
        });
        
        // 정확도 표시 원 추가
        const accuracyCircle = new naver.maps.Circle({
            map: map,
            center: position,
            radius: accuracy,
            strokeColor: '#188FFF',
            strokeOpacity: 0.3,
            strokeWeight: 1,
            fillColor: '#188FFF',
            fillOpacity: 0.1
        });
        
        // 정확도 원도 함께 업데이트하기 위해 저장
        currentLocationMarker.accuracyCircle = accuracyCircle;
        
        // 위치 추적 활성화 상태로 변경
        isWatchingLocation = true;
        currentLocationButton.classList.add('active');
    }
    
    // 위치 추적 시작
    function startWatchingLocation() {
        showLoading(true);
        
        if (navigator.geolocation) {
            // 위치 추적 시작 - 브라우저 기본 위치 권한 요청 사용
            watchId = navigator.geolocation.watchPosition(
                function(position) {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    const currentPos = new naver.maps.LatLng(lat, lng);
                    
                    // 첫 위치 수신 시 지도 이동
                    if (!isWatchingLocation) {
                        map.setCenter(currentPos);
                        map.setZoom(16);
                    }
                    
                    // 현위치 마커 생성 또는 업데이트
                    if (currentLocationMarker === null) {
                        // 마커 생성
                        createCurrentLocationMarker(currentPos, position.coords.accuracy);
                    } else {
                        // 마커 위치 업데이트
                        currentLocationMarker.setPosition(currentPos);
                        
                        // 정확도 원 업데이트
                        if (currentLocationMarker.accuracyCircle) {
                            currentLocationMarker.accuracyCircle.setCenter(currentPos);
                            currentLocationMarker.accuracyCircle.setRadius(position.coords.accuracy);
                        }
                    }
                    
                    // 상태 업데이트
                    isWatchingLocation = true;
                    currentLocationButton.classList.add('active');
                    showLoading(false);
                    
                    // 근처 쓰레기통 개수 업데이트
                    updateNearbyTrashCount();
                },
                function(error) {
                    showLoading(false);
                    console.error('위치 정보 오류:', error);
                    
                    let errorMessage = '위치 정보를 가져오는데 실패했습니다.';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = '위치 정보 접근이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = '위치 정보를 사용할 수 없습니다.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = '위치 정보 요청 시간이 초과되었습니다.';
                            break;
                    }
                    
                    alert(errorMessage);
                    stopWatchingLocation();
                    
                    // 위치 권한이 거부된 경우 기본 위치로 이동
                    map.setCenter(defaultCenter);
                    map.setZoom(13);
                },
                {
                    enableHighAccuracy: true,
                    maximumAge: 0,
                    timeout: 10000
                }
            );
        } else {
            showLoading(false);
            alert('이 브라우저에서는 위치 정보를 지원하지 않습니다.');
            
            // 위치 정보를 지원하지 않는 경우 기본 위치로 이동
            map.setCenter(defaultCenter);
            map.setZoom(13);
        }
    }
    
    // 위치 추적 중지
    function stopWatchingLocation() {
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
        }
        
        // 현위치 마커 제거
        if (currentLocationMarker !== null) {
            // 정확도 원 제거
            if (currentLocationMarker.accuracyCircle) {
                currentLocationMarker.accuracyCircle.setMap(null);
            }
            
            // 마커 제거
            currentLocationMarker.setMap(null);
            currentLocationMarker = null;
        }
        
        // 상태 업데이트
        isWatchingLocation = false;
        currentLocationButton.classList.remove('active');
    }
    
    // // 근처 쓰레기통 개수 업데이트
    // function updateNearbyTrashCount() {
    //     // 현재 위치를 기준으로 10km 이내의 쓰레기통 개수 계산
    //     if (currentLocationMarker && markers.length > 0) {
    //         const currentPos = currentLocationMarker.getPosition();
    //         let count = 0;
            
    //         markers.forEach(markerObj => {
    //             const markerPos = markerObj.marker.getPosition();
    //             const distance = naver.maps.Service.getDistance(currentPos, markerPos);
                
    //             // 10km = 10000m 이내인지 확인
    //             if (distance <= 10000) {
    //                 count++;
    //             }
    //         });
            
    //         // 개수 업데이트
    //         const nearbyTrashCount = document.getElementById('nearbyTrashCount');
    //         if (nearbyTrashCount) {
    //             nearbyTrashCount.textContent = count;
    //         }
    //     }
    // }

    // 근처 쓰레기통 개수 업데이트 함수 수정
    function updateNearbyTrashCount() {
        // 현재 위치를 기준으로 10km 이내의 쓰레기통 개수 계산
        if (currentLocationMarker && markers.length > 0) {
            const currentPos = currentLocationMarker.getPosition();
            let count = 0;
            
            markers.forEach(markerObj => {
                const markerPos = markerObj.marker.getPosition();
                
                // 두 지점 간의 거리 계산 (Haversine 공식 사용)
                const distance = calculateDistance(
                    currentPos.lat(), currentPos.lng(),
                    markerPos.lat(), markerPos.lng()
                );
                
                // 10km = 10000m 이내인지 확인
                if (distance <= 10000) {
                    count++;
                }
            });
            
            // 개수 업데이트
            const nearbyTrashCount = document.getElementById('nearbyTrashCount');
            if (nearbyTrashCount) {
                nearbyTrashCount.textContent = count;
            }
        }
    }

    // 두 지점 간의 거리를 계산하는 함수 (Haversine 공식)
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // 지구 반지름 (미터)
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;
        return distance; // 미터 단위 거리 반환
    }

    // 각도를 라디안으로 변환하는 함수
    function toRad(degrees) {
        return degrees * (Math.PI / 180);
    }

    function init() {
        initMap();
        loadCSVFromLocalFile();
        
        // 현위치 버튼 클릭 이벤트 - 브라우저 기본 위치 권한 요청 사용
        currentLocationButton.addEventListener('click', function() {
            if (isWatchingLocation) {
                // 이미 위치 추적 중이면 중지
                stopWatchingLocation();
            } else {
                // 브라우저 기본 위치 권한 요청 사용
                startWatchingLocation();
            }
        });
        
        // 닫기 버튼 클릭 시 상세 정보 패널 닫기
        if (closeDetail) {
            closeDetail.addEventListener('click', function() {
                if (locationDetail) {
                    locationDetail.classList.remove('show');
                }
            });
        }
        
        // 메뉴 버튼 클릭 이벤트
        if (menuButton) {
            menuButton.addEventListener('click', function() {
                if (sideMenu) {
                    sideMenu.classList.add('show');
                }
            });
        }
        
        // 메뉴 닫기 버튼 클릭 이벤트
        if (closeMenu) {
            closeMenu.addEventListener('click', function() {
                if (sideMenu) {
                    sideMenu.classList.remove('show');
                }
            });
        }
        
        // 메뉴 오버레이 클릭 이벤트
        if (menuOverlay) {
            menuOverlay.addEventListener('click', function() {
                if (sideMenu) {
                    sideMenu.classList.remove('show');
                }
            });
        }
        
        // 구 필터 변경 이벤트
        if (districtFilter) {
            districtFilter.addEventListener('change', function() {
                currentDistrict = this.value;
                filterMarkers();
            });
        }
        
        // 검색 버튼 클릭 이벤트
        if (searchButton && searchInput) {
            searchButton.addEventListener('click', function() {
                const searchText = searchInput.value.trim().toLowerCase();
                if (searchText) {
                    searchMarkers(searchText);
                }
            });
            
            // 엔터 키 이벤트
            searchInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const searchText = searchInput.value.trim().toLowerCase();
                    if (searchText) {
                        searchMarkers(searchText);
                    }
                }
            });
        }
        
        // 필터 버튼 클릭 이벤트
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // 이전 활성 버튼 비활성화
                filterButtons.forEach(btn => btn.classList.remove('active'));
                
                // 현재 버튼 활성화
                this.classList.add('active');
                
                // 필터 적용
                currentFilter = this.dataset.filter;
                filterMarkers();
            });
        });
        
        // 개발자 모드 설정
        setupDevMode();
    }
    
    // 마커 필터링 함수
    function filterMarkers() {
        markers.forEach(markerObj => {
            let visible = true;
            
            // 구 필터 적용
            if (currentDistrict !== 'all' && markerObj.data['구'] !== currentDistrict) {
                visible = false;
            }
            
            // 쓰레기통 유형 필터 적용
            if (currentFilter !== 'all') {
                const trashTypeText = markerObj.data['수거 쓰레기 종류'] || '';
                if (!trashTypeText.includes(currentFilter)) {
                    visible = false;
                }
            }
            
            // 마커 표시/숨김 설정
            markerObj.marker.setVisible(visible);
            markerObj.visible = visible;
        });
        
        // 표시된 마커 개수 업데이트
        updateVisibleMarkers();
    }

    // 개발자 모드 토글을 위한 키보드 단축키 (Ctrl+Shift+D)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            
            const currentDevMode = document.body.classList.contains('dev-mode');
            
            if (currentDevMode) {
                document.body.classList.remove('dev-mode');
                localStorage.setItem('devMode', 'false');
            } else {
                document.body.classList.add('dev-mode');
                localStorage.setItem('devMode', 'true');
            }
        }
    });

    // 마커 검색 함수
    function searchMarkers(searchText) {
        let found = false;
        const defaultIcon = {
            url: '/trashcan.svg',
            size: new naver.maps.Size(30, 40),
            scaledSize: new naver.maps.Size(30, 40),
            anchor: new naver.maps.Point(15, 40)
        };
        
        // 모든 마커를 기본 아이콘으로 초기화
        markers.forEach(markerObj => {
            markerObj.marker.setIcon(defaultIcon);
        });
        
        // 검색어가 없으면 종료
        if (!searchText || searchText.trim() === '') {
            // 선택된 마커가 있으면 해당 마커만 상세 아이콘으로 유지
            if (selectedMarker) {
                selectedMarker.setIcon({
                    url: './trashcan_detailed.svg',
                    size: new naver.maps.Size(30, 40),
                    scaledSize: new naver.maps.Size(30, 40),
                    anchor: new naver.maps.Point(15, 40)
                });
            }
            return;
        }
        
        markers.forEach(markerObj => {
            const address = markerObj.data['도로명 주소'] || '';
            const detail = markerObj.data['세부 위치'] || '';
            
            if (address.toLowerCase().includes(searchText.toLowerCase()) || 
                detail.toLowerCase().includes(searchText.toLowerCase())) {
                // 검색어와 일치하는 마커 찾음
                found = true;
                
                // 마커로 지도 이동
                map.setCenter(markerObj.marker.getPosition());
                map.setZoom(17);
                
                // 이전에 선택된 마커 초기화
                if (selectedMarker) {
                    selectedMarker.setIcon(defaultIcon);
                    if (selectedMarker.infoWindow) {
                        selectedMarker.infoWindow.close();
                    }
                }
                
                // 선택된 마커를 상세 아이콘으로 변경
                markerObj.marker.setIcon({
                    url: './trashcan_detailed.svg',
                    size: new naver.maps.Size(30, 40),
                    scaledSize: new naver.maps.Size(30, 40),
                    anchor: new naver.maps.Point(15, 40)
                });
                
                selectedMarker = markerObj.marker;
                selectedMarkerCoords = markerObj.marker.getPosition();
                
                // 인포윈도우 내용 생성 및 표시
                const content = createInfoWindowContent(markerObj.data);
                const infoWindow = new naver.maps.InfoWindow({
                    content: content,
                    borderWidth: 0,
                    backgroundColor: 'transparent',
                    disableAnchor: true,
                    pixelOffset: new naver.maps.Point(0, -10)
                });
                
                infoWindow.open(map, markerObj.marker);
                markerObj.marker.infoWindow = infoWindow;
                
                // 상세 정보 패널 표시
                showDetailPanel(markerObj.data, markerObj.marker.getPosition());
            }
        });
        
        if (!found) {
            alert('검색 결과가 없습니다.');
        }
    }
    
    // 개발자 모드 설정 함수 (정의되지 않은 경우 추가)
    function setupDevMode() {
        // 로컬 스토리지에서 개발자 모드 설정 불러오기
        const devMode = localStorage.getItem('devMode') === 'true';
        if (devMode) {
            document.body.classList.add('dev-mode');
        }
    }
    
    // 초기화
    init();
});