import React from 'react';
import type { SceneSlot, SlotOption } from '@livewallpaper/types';
import { LayersPanel } from './LayersPanel';
import type { SpriteEntry } from './SpriteListPanel';
import { FocusControl } from '../FocusControl';
import { SpritePanelControl } from './SpritePanelControl';
import { SectionHeading } from './SectionHeading';
import './SceneEditorPanel.scss';

export type { SceneOption } from '../SceneSelectorControl';

interface SelectedSprite {
  index: number;
  name: string;
  x: number;
  y: number;
  depth: number;
  width: number;
  height: number;
}

interface SceneEditorPanelProps {
  sceneLoaded: boolean;
  orientation: 'portrait' | 'landscape';
  xFocus: number;
  yFocus: number;
  spriteEntries: SpriteEntry[];
  slots: SceneSlot[];
  selectedSlotId: string | null;
  expandedSlotIds: ReadonlySet<string>;
  isOptionEligible?: (slotId: string, option: SlotOption) => boolean;
  onSelectSlot: (slotId: string) => void;
  onToggleSlotExpand: (slotId: string) => void;
  onSelectOption: (slotId: string, optionId: string) => void;
  previewedOptionId?: string | null;
  onRenameOption: (slotId: string, optionId: string, name: string) => void;
  onChangeOptionTexture: (slotId: string, optionId: string, textureResource: string) => void;
  onEditOptionTexture: (slotId: string, optionId: string) => void;
  onDeleteOption: (slotId: string, optionId: string) => void;
  onAddSlot: () => void;
  projectId: string;
  selectedSprite: SelectedSprite | null;
  onXFocusChange: (value: number) => void;
  onXFocusChangeStart?: (value: number) => void;
  onXFocusCommit?: (value: number) => void;
  onYFocusChange: (value: number) => void;
  onYFocusChangeStart?: (value: number) => void;
  onYFocusCommit?: (value: number) => void;
  onSpriteToggle: (index: number) => void;
  onSpriteSelect: (index: number) => void;
  onAddSprite: (textureResource: string) => void;
  onChangeTexture: (index: number, textureResource: string) => void;
  onDeleteSprite: (index: number) => void;
  onRenameSprite: (index: number, newName: string) => void;
  onEditTexture: (index: number) => void;
  // Name of the condition set currently being previewed for this sprite, if any (legacy scenes
  // may still carry sprite conditions even though the editor no longer authors them).
  activeConditionLabel?: string | null;
  onSpritePositionChange: (x: number, y: number) => void;
  onSpritePositionChangeStart?: (x: number, y: number) => void;
  onSpritePositionCommit?: (x: number, y: number) => void;
  onSpriteDepthChange: (depth: number) => void;
  onSpriteDepthChangeStart?: (depth: number) => void;
  onSpriteDepthCommit?: (depth: number) => void;
  onSpriteSizeChange: (width: number, height: number) => void;
  onSpriteSizeChangeStart?: () => void;
  onSpriteSizeCommit?: (width: number, height: number) => void;
}

export function SceneEditorPanel({
  sceneLoaded,
  orientation,
  xFocus,
  yFocus,
  spriteEntries,
  slots,
  selectedSlotId,
  expandedSlotIds,
  isOptionEligible,
  onSelectSlot,
  onToggleSlotExpand,
  onSelectOption,
  previewedOptionId,
  onRenameOption,
  onChangeOptionTexture,
  onEditOptionTexture,
  onDeleteOption,
  onAddSlot,
  projectId,
  selectedSprite,
  onXFocusChange,
  onXFocusChangeStart,
  onXFocusCommit,
  onYFocusChange,
  onYFocusChangeStart,
  onYFocusCommit,
  onSpriteToggle,
  onSpriteSelect,
  onAddSprite,
  onChangeTexture,
  onDeleteSprite,
  onRenameSprite,
  onEditTexture,
  activeConditionLabel,
  onSpritePositionChange,
  onSpritePositionChangeStart,
  onSpritePositionCommit,
  onSpriteDepthChange,
  onSpriteDepthChangeStart,
  onSpriteDepthCommit,
  onSpriteSizeChange,
  onSpriteSizeChangeStart,
  onSpriteSizeCommit,
}: SceneEditorPanelProps) {

  return (
    <div className="scene-editor-panel">
      <div className="scene-editor-panel__section">
        <SectionHeading>Scene</SectionHeading>
        {orientation === 'portrait'
          ? <FocusControl axis="X" disabled={!sceneLoaded} value={xFocus} onChange={onXFocusChange} onChangeStart={onXFocusChangeStart} onChangeCommit={onXFocusCommit} />
          : <FocusControl axis="Y" disabled={!sceneLoaded} value={yFocus} onChange={onYFocusChange} onChangeStart={onYFocusChangeStart} onChangeCommit={onYFocusCommit} />}
      </div>

      <div className="scene-editor-panel__section">
        <LayersPanel
          sprites={spriteEntries}
          slots={slots}
          projectId={projectId}
          selectedSpriteName={selectedSlotId ? null : (selectedSprite?.name ?? null)}
          selectedSlotId={selectedSlotId}
          expandedSlotIds={expandedSlotIds}
          isOptionEligible={isOptionEligible}
          onSelectSprite={onSpriteSelect}
          onToggleSprite={onSpriteToggle}
          onAddSprite={onAddSprite}
          onChangeTexture={onChangeTexture}
          onDeleteSprite={onDeleteSprite}
          onRenameSprite={onRenameSprite}
          onEditTexture={onEditTexture}
          onSelectSlot={onSelectSlot}
          onToggleSlotExpand={onToggleSlotExpand}
          onSelectOption={onSelectOption}
          previewedOptionId={previewedOptionId}
          onRenameOption={onRenameOption}
          onChangeOptionTexture={onChangeOptionTexture}
          onEditOptionTexture={onEditOptionTexture}
          onDeleteOption={onDeleteOption}
          onAddSlot={onAddSlot}
        />
      </div>

      <div className="scene-editor-panel__section">
        <SectionHeading>
          {selectedSprite ? selectedSprite.name : 'No sprite selected'}
          {activeConditionLabel && selectedSprite && (
            <span className="scene-editor-panel__condition-badge">
              {activeConditionLabel}
            </span>
          )}
        </SectionHeading>
        <SpritePanelControl
          spriteName={selectedSprite?.name ?? ''}
          x={selectedSprite?.x ?? 0}
          y={selectedSprite?.y ?? 0}
          depth={selectedSprite?.depth ?? 1.0}
          width={selectedSprite?.width ?? 0}
          height={selectedSprite?.height ?? 0}
          disabled={selectedSprite === null}
          onChange={onSpritePositionChange}
          onChangeStart={onSpritePositionChangeStart}
          onChangeCommit={onSpritePositionCommit}
          onDepthChange={onSpriteDepthChange}
          onDepthChangeStart={onSpriteDepthChangeStart}
          onDepthCommit={onSpriteDepthCommit}
          onSizeChange={onSpriteSizeChange}
          onSizeChangeStart={onSpriteSizeChangeStart}
          onSizeCommit={onSpriteSizeCommit}
        />
      </div>
    </div>
  );
}
