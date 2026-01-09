export const getBackendUrl = (url) => {
    if (!url) return url;

    // Use VITE_BACKEND_URL if available, otherwise default to relative path
    // In Vite, it is import.meta.env.VITE_BACKEND_URL
    // Note: Standard process.env might not be populated in Vite without plugin
    const backendUrl = import.meta.env.VITE_BACKEND_URL || '/';

    // Check if URL contains '/public/'
    if (url.includes('/public/')) {
        // Regex to match protocol and domain (e.g. http://localhost:8081 or https://app.com)
        // We want to remove it only if it is pointing to OUR backend public folder.
        // To be safe and "fix dynamic links", we assume any /public/ link is ours 
        // if we are cleaning up from legacy ports.
        // However, we should be careful about external links containing /public/.
        // But in this context (profilePic, media), it's overwhelmingly ours.

        // Split by /public/ and take the path
        const parts = url.split('/public/');
        const relativePath = `public/${parts[1]}`;

        // If backendUrl is just '/' or empty, return '/public/...'
        if (backendUrl === '/' || backendUrl === '') {
            return `/${relativePath}`;
        }

        // If backendUrl is absolute (e.g. http://api.watink.com)
        // and relativePath starts with public/...
        // Combine them.
        return `${backendUrl}${relativePath}`;
    }

    return url;
};
