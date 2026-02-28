/**
 * FigPal Case Study - Main Logic
 * 
 * This file handles the dynamic loading of content from CASE_STUDY_CONTENT
 * and manages the general UI state of the case study page.
 */

function loadContent() {
    const data = CASE_STUDY_CONTENT;
    if (!data) {
        console.error('CASE_STUDY_CONTENT not found.');
        return;
    }

    // --- Meta Info ---
    document.title = data.meta.title;
    const mainTitle = document.getElementById('main-title');
    const mainSubtitle = document.getElementById('main-subtitle');
    const authorName = document.getElementById('author-name');
    const postDate = document.getElementById('post-date');
    const readTime = document.getElementById('read-time');
    const achievementText = document.getElementById('achievement-text');

    if (mainTitle) mainTitle.textContent = data.meta.title;
    if (mainSubtitle) mainSubtitle.textContent = data.meta.subtitle;
    if (authorName) authorName.textContent = data.meta.author;
    if (postDate) postDate.textContent = data.meta.date;
    if (readTime) readTime.textContent = data.meta.readTime;
    if (achievementText) achievementText.textContent = data.meta.achievement;

    // --- Role & Team Size ---
    const roleText = document.getElementById('role-text');
    const teamCount = document.getElementById('team-count');
    if (roleText) roleText.textContent = data.team.members[0].role;
    if (teamCount) teamCount.textContent = `${data.team.title} (${data.team.members.length} members)`;

    // --- TL;DR Section ---
    const tldrHeader = document.getElementById('tldr-header');
    const tldrContainer = document.getElementById('tldr-container');
    if (tldrHeader) tldrHeader.textContent = data.tldr.title;
    if (tldrContainer) {
        tldrContainer.innerHTML = ''; // Clear loading state
        data.tldr.items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'tldr-item-text';
            div.innerHTML = `<p>${item.label} — ${item.title}</p><span>${item.description}</span>`;
            tldrContainer.appendChild(div);
        });
    }

    // --- Team Section ---
    const teamTitle = document.getElementById('team-title');
    const teamContainer = document.getElementById('team-container');
    if (teamTitle) teamTitle.textContent = data.team.title;
    if (teamContainer) {
        teamContainer.innerHTML = ''; // Clear loading state
        data.team.members.forEach(member => {
            const div = document.createElement('div');
            div.className = 'team-member';
            div.innerHTML = `
        <a href="${member.url}" target="_blank">${member.name}</a>
        <span>${member.role}</span>
      `;
            teamContainer.appendChild(div);
        });
    }

    // --- Narrative Sections ---
    const mdToHtml = (text) => text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    const renderSection = (id, section) => {
        const titleEl = document.getElementById(`${id}-title`);
        const contentEl = document.getElementById(`${id}-content`);
        if (titleEl) titleEl.textContent = section.title;
        if (contentEl) {
            contentEl.innerHTML = section.paragraphs
                .map(p => `<p>${mdToHtml(p)}</p>`)
                .join('');
        }
    };

    // Render core sections
    renderSection('problem', data.sections.problem);
    renderSection('solution', data.sections.solution);
    renderSection('business', data.sections.business);
    renderSection('execution', data.sections.execution);
    renderSection('maker', data.sections.maker);
    renderSection('vibe-coding', data.sections.vibeCoding);
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadContent);
} else {
    loadContent();
}
