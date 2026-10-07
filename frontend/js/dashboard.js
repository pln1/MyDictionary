const dashboard = {
    currentTopicId: 'saved',
    topicListEl: document.getElementById('topic-list'),
    unitListEl: document.getElementById('unit-list'),
    currentTopicNameEl: document.getElementById('current-topic-name'),
    mainContentEl: document.querySelector('.main-content'),
    
    nextPageUrl: null,
    isLoading: false,
    draggedItemType: null,
    draggedElement: null,
    draggedDataId: null,

    init() {
        document.getElementById('btn-new-topic').addEventListener('click', () => this.handleNewTopic());
        
        this.mainContentEl.addEventListener('scroll', () => {
            if (this.mainContentEl.scrollTop + this.mainContentEl.clientHeight >= this.mainContentEl.scrollHeight - 50) {
                this.loadMoreUnits();
            }
        });

        document.getElementById('btn-topic-options').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeAllDropdowns();
            if (this.currentTopicId === 'saved') {
                alert('System topic cannot be modified.');
                return;
            }
            document.getElementById('topic-dropdown').classList.remove('hidden');
        });

        document.addEventListener('click', () => this.closeAllDropdowns());

        document.getElementById('btn-rename-topic').addEventListener('click', async () => {
            const newName = await this.promptInput('Rename Topic:', this.currentTopicNameEl.textContent);
            if (newName && newName.trim()) {
                const trimmedName = newName.trim();
                try {
                    await api.renameTopic(this.currentTopicId, trimmedName);
                    this.currentTopicNameEl.textContent = trimmedName; // Оновлюємо заголовок сторінки
                    await this.loadTopics();
                } catch (err) {
                    alert('Failed to rename topic.');
                }
            }
        });

        document.getElementById('btn-delete-topic').addEventListener('click', async () => {
            if (confirm('Are you sure you want to delete this topic?')) {
                await api.deleteTopic(this.currentTopicId);
                this.currentTopicId = 'saved';
                this.currentTopicNameEl.textContent = 'Saved';
                this.loadTopics();
            }
        });
    },

    closeAllDropdowns() {
        const topicDropdown = document.getElementById('topic-dropdown');
        if (topicDropdown) topicDropdown.classList.add('hidden');
        document.querySelectorAll('.unit-dropdown').forEach(el => el.classList.add('hidden'));
    },

    promptInput(title, defaultValue = '') {
        return new Promise((resolve) => {
            const modal = document.getElementById('input-modal');
            const titleEl = document.getElementById('input-modal-title');
            const inputEl = document.getElementById('input-modal-field');
            const btnSave = document.getElementById('input-modal-save');
            const btnCancel = document.getElementById('input-modal-cancel');
            const closeBtn = document.getElementById('input-modal-close');

            titleEl.textContent = title;
            inputEl.value = defaultValue;
            modal.classList.remove('hidden');
            inputEl.focus();

            const cleanup = () => {
                modal.classList.add('hidden');
                btnSave.removeEventListener('click', onSave);
                btnCancel.removeEventListener('click', onCancel);
                closeBtn.removeEventListener('click', onCancel);
            };

            const onSave = () => {
                cleanup();
                resolve(inputEl.value.trim());
            };

            const onCancel = () => {
                cleanup();
                resolve(null);
            };

            btnSave.addEventListener('click', onSave);
            btnCancel.addEventListener('click', onCancel);
            closeBtn.addEventListener('click', onCancel);
        });
    },

    async loadTopics() {
        try {
            const topics = await api.getTopics();
            const savedTopic = topics.find(t => t.id === 'saved');
            const customTopics = topics.filter(t => t.id !== 'saved').sort((a, b) => {
                if (a.position !== b.position) return a.position - b.position;
                return new Date(a.created_at) - new Date(b.created_at);
            });
            
            this.renderTopics([savedTopic, ...customTopics]);
            this.loadUnits(this.currentTopicId, true);
        } catch (err) {
            console.error('Failed to load topics', err);
        }
    },

    renderTopics(topics) {
        this.topicListEl.innerHTML = '';
        topics.forEach((topic) => {
            const li = document.createElement('li');
            li.textContent = `${topic.name} (${topic.units_count})`;
            li.className = topic.id === this.currentTopicId ? 'active-topic' : '';
            li.dataset.id = topic.id;
            
            if (topic.id !== 'saved') {
                li.draggable = true;
                li.addEventListener('dragstart', (e) => this.handleTopicDragStart(e, li, topic.id));
                li.addEventListener('dragend', () => li.classList.remove('dragging'));
            }
            
            li.addEventListener('dragover', (e) => this.handleTopicDragOver(e, li));
            li.addEventListener('dragleave', () => {
                li.style.borderTop = "";
                li.style.borderBottom = "";
                li.classList.remove('drop-target');
            });
            li.addEventListener('drop', (e) => this.handleTopicDrop(e, li, topic.id));

            li.addEventListener('click', () => {
                this.currentTopicId = topic.id;
                this.currentTopicNameEl.textContent = topic.name;
                document.querySelectorAll('#topic-list li').forEach(el => el.classList.remove('active-topic'));
                li.classList.add('active-topic');
                this.loadUnits(topic.id, true);
            });
            this.topicListEl.appendChild(li);
        });
    },

    async loadUnits(topicId, reset = false) {
        if (reset) {
            this.unitListEl.innerHTML = 'Loading...';
            this.nextPageUrl = null;
        }
        this.isLoading = true;

        try {
            const data = await api.getUnits(topicId, this.nextPageUrl);
            this.nextPageUrl = data.next;
            if (reset) this.unitListEl.innerHTML = '';
            this.renderUnits(data.results || data, reset);
        } catch (err) {
            if (reset) this.unitListEl.innerHTML = 'Failed to load units.';
        } finally {
            this.isLoading = false;
        }
    },

    async loadMoreUnits() {
        if (this.nextPageUrl && !this.isLoading) {
            await this.loadUnits(this.currentTopicId, false);
        }
    },

    renderUnits(units, reset) {
        if (reset && !units.length) {
            this.unitListEl.innerHTML = '<p>No words saved here yet.</p>';
            return;
        }

        units.forEach(unit => {
            const div = document.createElement('div');
            const isLearned = unit.state === 'learned';
            div.className = `unit-item ${isLearned ? 'learned' : ''}`;
            div.dataset.id = unit.id;
            div.draggable = true;
            
            const isSaved = this.currentTopicId === 'saved';
            const toggleText = isLearned ? 'Mark as Learning' : 'Mark as Learned';

            div.innerHTML = `
                <div class="drag-handle" style="cursor: grab; margin-right: 10px; color: #aaa;">☰</div>
                <input type="checkbox" class="unit-checkbox" ${isLearned ? 'checked' : ''} style="margin-right: 12px; cursor: pointer;">
                <div class="unit-content" style="flex: 1; display: flex; flex-direction: column;">
                    <div style="font-size: 11px; color: var(--primary-orange); font-weight: bold; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.5px;">
                        ${unit.source_lang} &rarr; ${unit.target_lang}
                    </div>
                    <div class="unit-text" style="font-size: 15px; color: var(--text-main);">
                        <strong>${unit.text}</strong> &mdash; ${unit.translation}
                    </div>
                </div>
                <div class="unit-actions" style="position: relative;">
                    <button class="btn-unit-options" style="background: transparent; color: var(--text-muted); font-size: 20px; padding: 0 10px; box-shadow: none;">⋮</button>
                    <div class="dropdown-menu hidden unit-dropdown">
                        <button class="btn-toggle-state">${toggleText}</button>
                        ${!isSaved ? `<button class="btn-remove-topic">Remove from Topic</button>` : ''}
                        <button class="btn-delete-perm danger">Delete Permanently</button>
                    </div>
                </div>
            `;

            const optionsBtn = div.querySelector('.btn-unit-options');
            const dropdown = div.querySelector('.unit-dropdown');
            const checkbox = div.querySelector('.unit-checkbox');
            const toggleStateBtn = div.querySelector('.btn-toggle-state');

            optionsBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeAllDropdowns();
                dropdown.classList.remove('hidden');
            });

            const toggleStatus = async () => {
                const updated = await api.toggleUnitState(unit.id);
                const updatedLearned = updated.state === 'learned';
                
                div.classList.toggle('learned', updatedLearned);
                checkbox.checked = updatedLearned;
                toggleStateBtn.textContent = updatedLearned ? 'Mark as Learning' : 'Mark as Learned';
            };

            checkbox.addEventListener('change', async (e) => {
                e.stopPropagation();
                await toggleStatus();
            });

            toggleStateBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                dropdown.classList.add('hidden');
                await toggleStatus();
            });

            const btnRemove = div.querySelector('.btn-remove-topic');
            if (btnRemove) {
                btnRemove.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await api.removeUnitFromTopic(unit.id, this.currentTopicId);
                    div.remove();
                    this.loadTopics();
                });
            }

            div.querySelector('.btn-delete-perm').addEventListener('click', async (e) => {
                e.stopPropagation();
                if (confirm('Delete this word permanently?')) {
                    await api.deleteUnit(unit.id);
                    div.remove();
                    this.loadTopics();
                }
            });

            div.addEventListener('dragstart', (e) => this.handleUnitDragStart(e, div, unit.id));
            div.addEventListener('dragover', (e) => this.handleUnitDragOver(e, div));
            div.addEventListener('dragleave', () => {
                div.style.borderTop = "";
                div.style.borderBottom = "";
            });
            div.addEventListener('drop', (e) => this.handleUnitDrop(e, div));
            div.addEventListener('dragend', () => div.classList.remove('dragging'));

            this.unitListEl.appendChild(div);
        });
    },

    async handleNewTopic() {
        const name = await this.promptInput('Enter new topic name:');
        if (name) {
            try {
                await api.createTopic(name);
                this.loadTopics();
            } catch (err) {
                alert('Failed to create topic.');
            }
        }
    },

    handleTopicDragStart(e, el, id) {
        this.draggedItemType = 'topic';
        this.draggedElement = el;
        this.draggedDataId = id;
        setTimeout(() => el.classList.add('dragging'), 0);
    },
    
    handleTopicDragOver(e, el) {
        e.preventDefault(); 
        if (el.dataset.id === 'saved' && this.draggedItemType === 'topic') return;
        if (this.draggedItemType === 'topic' && this.draggedElement === el) return;
        
        if (this.draggedItemType === 'topic') {
            const bounding = el.getBoundingClientRect();
            const offset = bounding.y + (bounding.height / 2);
            if (e.clientY - offset > 0) {
                el.style.borderBottom = "2px solid var(--primary-orange)";
                el.style.borderTop = "";
            } else {
                el.style.borderTop = "2px solid var(--primary-orange)";
                el.style.borderBottom = "";
            }
        } else if (this.draggedItemType === 'unit' && el.dataset.id !== 'saved') {
            el.classList.add('drop-target');
        }
    },

    async handleTopicDrop(e, el, dropTargetId) {
        e.preventDefault();
        el.style.borderTop = "";
        el.style.borderBottom = "";
        el.classList.remove('drop-target');
        
        if (this.draggedItemType === 'topic') {
            if (dropTargetId === 'saved' || this.draggedElement === el) return;
            
            const bounding = el.getBoundingClientRect();
            const offset = bounding.y + (bounding.height / 2);
            if (e.clientY - offset > 0) el.after(this.draggedElement);
            else el.before(this.draggedElement);
            
            const positions = [];
            this.topicListEl.querySelectorAll('li').forEach((li, index) => {
                if (li.dataset.id !== 'saved') positions.push({ id: li.dataset.id, position: index });
            });
            await api.reorderTopics(positions);
        } 
        else if (this.draggedItemType === 'unit') {
            if (dropTargetId === 'saved') return;
            try {
                await api.setUnitTopics(this.draggedDataId, [dropTargetId]);
                if (this.draggedElement && this.currentTopicId !== dropTargetId) {
                    this.draggedElement.remove();
                }
                this.loadTopics();
            } catch (err) {
                alert('Failed to move word.');
            }
        }
        this.draggedItemType = null;
    },

    handleUnitDragStart(e, el, id) {
        this.draggedItemType = 'unit';
        this.draggedElement = el;
        this.draggedDataId = id;
        setTimeout(() => el.classList.add('dragging'), 0);
    },

    handleUnitDragOver(e, el) {
        e.preventDefault();
        if (this.draggedItemType !== 'unit' || this.draggedElement === el || this.currentTopicId === 'saved') return;
        
        const bounding = el.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        if (e.clientY - offset > 0) {
            el.style.borderBottom = "2px solid var(--primary-orange)";
            el.style.borderTop = "";
        } else {
            el.style.borderTop = "2px solid var(--primary-orange)";
            el.style.borderBottom = "";
        }
    },

    async handleUnitDrop(e, el) {
        e.preventDefault();
        el.style.borderTop = "";
        el.style.borderBottom = "";
        if (this.draggedItemType !== 'unit' || this.draggedElement === el || this.currentTopicId === 'saved') return;

        const bounding = el.getBoundingClientRect();
        const offset = bounding.y + (bounding.height / 2);
        if (e.clientY - offset > 0) el.after(this.draggedElement);
        else el.before(this.draggedElement);

        const positions = [];
        this.unitListEl.querySelectorAll('.unit-item').forEach((item, index) => {
            positions.push({ unit_id: item.dataset.id, position: index });
        });
        await api.reorderUnits(this.currentTopicId, positions);
        this.draggedItemType = null;
    }
};