export async function request(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : {};

    if (!response.ok || payload.success === false) {
      const errorMessage = payload.error || response.statusText || 'Неизвестная ошибка';
      throw new Error(errorMessage);
    }

    return payload;
  } catch (error) {
    if (error.name === 'TypeError') {
      throw new Error('Сервер недоступен или вы офлайн');
    }
    throw error;
  }
}
