import React, { useState, useEffect, useRef } from 'react';

function CommandPalette({ onClose, onCommand, commands }) {
    const [query, setQuery] = useState('');
    const [filteredCommands, setFilteredCommands] = useState(commands);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        if (query.trim()) {
            const filtered = commands.filter(cmd =>
                cmd.label.toLowerCase().includes(query.toLowerCase()) ||
                (cmd.shortcut && cmd.shortcut.toLowerCase().includes(query.toLowerCase()))
            );
            setFilteredCommands(filtered);
            setSelectedIndex(0);
        } else {
            setFilteredCommands(commands);
            setSelectedIndex(0);
        }
    }, [query, commands]);

    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => 
                prev < filteredCommands.length - 1 ? prev + 1 : 0
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => 
                prev > 0 ? prev - 1 : filteredCommands.length - 1
            );
        } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
            handleSelect(filteredCommands[selectedIndex]);
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    const handleSelect = (command) => {
        if (onCommand) {
            onCommand(command.id);
        }
        onClose();
    };

    return (
        <div className="command-palette-overlay" onClick={onClose}>
            <div className="command-palette" onClick={(e) => e.stopPropagation()}>
                <div className="command-palette-input">
                    <span className="command-palette-icon">⌘</span>
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a command..."
                        className="command-palette-search"
                    />
                    <button onClick={onClose} className="command-palette-close">✕</button>
                </div>

                <div className="command-palette-results">
                    {filteredCommands.length > 0 ? (
                        filteredCommands.map((cmd, index) => (
                            <div
                                key={cmd.id}
                                className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
                                onClick={() => handleSelect(cmd)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <span className="command-label">{cmd.label}</span>
                                {cmd.shortcut && (
                                    <span className="command-shortcut">{cmd.shortcut}</span>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="command-no-results">
                            No matching commands found
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default CommandPalette;