export const renderTextWithLinks = (text) => {
    if (!text || typeof text !== "string") return text;

    // Regex nhận diện link (bao gồm https, www, query, hash...)
    const urlRegex = /((?:https?:\/\/|www\.)[^\s<>"'`]+|(?:(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(?:\/[^\s<>"'`]*)?)/gi;

    const elements = [];
    let lastIndex = 0;

    let match;
    while ((match = urlRegex.exec(text)) !== null) {
        const { index } = match;
        const url = match[0];

        // Thêm text trước URL
        if (index > lastIndex) {
            elements.push(text.slice(lastIndex, index));
        }

        // Xử lý URL đầy đủ
        const href = url.startsWith("http") ? url : `https://${url}`;

        elements.push(
            <a
                key={index}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                // className="text-blue-500 hover:text-blue-700 underline"
                className="font-medium underline"

                onClick={(e) => e.stopPropagation()}
            >
                {url}
            </a>
        );

        lastIndex = index + url.length;
    }

    // Thêm phần text còn lại sau cùng
    if (lastIndex < text.length) {
        elements.push(text.slice(lastIndex));
    }

    return elements;
};
