// domUtils.js

export function showLoading(element, show) {
    if (element) {
        element.style.display = show ? 'flex' : 'none';
    }
}

export function updateCountDisplay(element, count, label) {
    if (element) {
        element.textContent = `${label} ${count}개`;
    }
}

export function createOption(value, text) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    return option;
}
