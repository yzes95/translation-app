import Dexie from 'dexie';

export const db = new Dexie('LinguaFlowDB');

db.version(1).stores({
  meetings: '++id, title, createdAt, sourceLang, targetLang, hasSummary',
  settings: 'key',
  modelCache: 'modelId, name, size, status, updated'
});

export const saveMeeting = async (meetingData) => {
  try {
    const id = await db.meetings.add({
      ...meetingData,
      createdAt: new Date().toISOString()
    });
    return id;
  } catch (error) {
    console.error('Failed to save meeting to IndexedDB:', error);
    return null;
  }
};

export const updateMeeting = async (id, updateData) => {
  try {
    await db.meetings.update(id, updateData);
    return true;
  } catch (error) {
    console.error(`Failed to update meeting ${id}:`, error);
    return false;
  }
};

export const getAllMeetings = async () => {
  try {
    return await db.meetings.orderBy('id').reverse().toArray();
  } catch (error) {
    console.error('Failed to fetch meetings:', error);
    return [];
  }
};

export const deleteMeeting = async (id) => {
  try {
    await db.meetings.delete(id);
    return true;
  } catch (error) {
    console.error(`Failed to delete meeting ${id}:`, error);
    return false;
  }
};

export const clearAllMeetings = async () => {
  try {
    await db.meetings.clear();
    return true;
  } catch (error) {
    console.error('Failed to clear meetings:', error);
    return false;
  }
};
