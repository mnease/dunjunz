import { describe, expect, it } from 'vitest';
import { defaultSave } from './save';
import { markRoomVisited } from './mapz';
import {
  hasHeardRoomVoice,
  markRoomVoiceHeard,
  roomEntryVoiceDialog,
  roomVoiceFlag,
} from './room-voice';
import { syncAchievements } from './achievements';
import {
  BASIC_BOX_CONTENTS,
  CRAWLER_BASIC_BOX_ID,
  CRAWLER_STARTER_BOX_ID,
  grantLootBoxesForAchievements,
  openLootBox,
  STARTER_BOX_CONTENTS,
} from './loot-boxes';
import { isTutorialComplete } from './tutorial';
import { useInventoryItem } from './inventory';

describe('room entry voice', () => {
  it('guild hall first visit returns achievement voice lines', () => {
    const save = defaultSave();
    const lines = roomEntryVoiceDialog('guild_hall', save);
    expect(lines).not.toBeNull();
    const text = lines!.join('\n');
    expect(text).toMatch(/TUTORIAL GUILD/i);
    expect(text).toMatch(/GUILD MASTER/i);
    expect(text).toMatch(/VOICE CUTS THROUGH/i);
  });

  it('does not repeat after mark heard', () => {
    let save = defaultSave();
    expect(roomEntryVoiceDialog('guild_hall', save)).not.toBeNull();
    save = markRoomVoiceHeard(save, 'guild_hall');
    expect(hasHeardRoomVoice(save, 'guild_hall')).toBe(true);
    expect(save.flags?.[roomVoiceFlag('guild_hall')]).toBe(true);
    expect(roomEntryVoiceDialog('guild_hall', save)).toBeNull();
  });
});

describe('tutorial guild achievement + basic box', () => {
  it('unlocks brag on visiting guild_hall and grants bronze crawler basic box', () => {
    let save = markRoomVisited(defaultSave(), 'guild_hall');
    const { save: next, newly } = syncAchievements(save);
    expect(newly.some((a) => a.id === 'brag-tutorial-guild')).toBe(true);
    expect(newly.find((a) => a.id === 'brag-tutorial-guild')?.title).toMatch(
      /TUTORIAL GUILD/i,
    );
    const boxed = grantLootBoxesForAchievements(next, newly, () => 0.01);
    expect(boxed.save.stacks[CRAWLER_BASIC_BOX_ID]).toBe(1);
    expect(boxed.save.flags?.got_crawler_basic_box).toBe(true);
    expect(boxed.boxes[0]?.templateId).toBe(CRAWLER_BASIC_BOX_ID);
    // Distinct from graduation starter kit
    expect(BASIC_BOX_CONTENTS).not.toEqual(STARTER_BOX_CONTENTS);
    expect(BASIC_BOX_CONTENTS).not.toContain('mild_sword');
  });

  it('basic box opens to survival gear, not full leather kit', () => {
    let save = defaultSave();
    save = {
      ...save,
      stacks: { ...save.stacks, [CRAWLER_BASIC_BOX_ID]: 1 },
      flags: { ...save.flags, tutorial_complete: true },
    };
    const r = openLootBox(save, CRAWLER_BASIC_BOX_ID, () => 0.1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ids = r.grantedItems.map((g) => g.templateId);
    expect(ids).toContain('torch');
    expect(ids).toContain('potion');
    expect(ids).toContain('leather_shoes');
    expect(ids).toContain('copper_ring');
    expect(ids).not.toContain('mild_sword');
    expect(ids).not.toContain('wood_shield');
  });

  it('cannot open loot boxes before tutorial complete', () => {
    let save = defaultSave();
    expect(isTutorialComplete(save)).toBe(false);
    save = {
      ...save,
      stacks: { ...save.stacks, [CRAWLER_BASIC_BOX_ID]: 1 },
    };
    const r = useInventoryItem(save, CRAWLER_BASIC_BOX_ID);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toMatch(/TUTORIAL/i);
    expect(r.save.stacks[CRAWLER_BASIC_BOX_ID]).toBe(1);
  });

  it('starter box still granted only on tutorial complete path', () => {
    const save = markRoomVisited(defaultSave(), 'guild_hall');
    const { newly } = syncAchievements(save);
    const boxed = grantLootBoxesForAchievements(save, newly, () => 0.01);
    expect(boxed.save.stacks[CRAWLER_STARTER_BOX_ID] ?? 0).toBe(0);
  });
});
