import { describe, it, expect, beforeEach, vi } from 'vitest';
import { store } from '../store';

describe('Store Module (locale)', () => {
  beforeEach(() => {
    const keys = Object.keys(localStorage);
    keys.forEach(k => localStorage.removeItem(k));
    return store._reload();
  });

  // Setup: create a user and a task so tests are deterministic
  async function seed() {
    await store.addUser('TestUser');
    await store.setCurrentUser(1);
    const rooms = await store.getRooms();
    const roomId = rooms[0]?.id || 1;
    await store.createTask({
      name: 'Seed task',
      room_ids: [roomId],
      frequency_days: 7,
      difficulty: 3,
    });
  }

  it('should have getTasks method returning Promise', async () => {
    const tasks = await store.getTasks();
    expect(Array.isArray(tasks)).toBe(true);
  });

  it('should complete a task and return points', async () => {
    await seed();
    const tasks = await store.getTasks();
    const result = await store.completeTask(tasks[0].id, true);
    expect(result).toHaveProperty('points');
    expect(typeof result.points).toBe('number');
  });

  it('should getStats with user_id and user_name', async () => {
    await seed();
    const stats = await store.getStats();
    expect(stats).toHaveProperty('leaderboard');
    expect(Array.isArray(stats.leaderboard)).toBe(true);
    if (stats.leaderboard.length > 0) {
      const user = stats.leaderboard[0];
      expect(user).toHaveProperty('user_id');
      expect(user).toHaveProperty('user_name');
      expect(user).toHaveProperty('weekly_points');
      expect(user).toHaveProperty('total_points');
    }
  });

  it('should have toggleVacation method', async () => {
    const result = await store.toggleVacation(true);
    expect(result).toHaveProperty('success', true);
  });

  it('should create and retrieve a task', async () => {
    const rooms = await store.getRooms();
    const roomId = rooms[0]?.id || 1;
    await store.createTask({
      name: 'Test task',
      room_ids: [roomId],
      frequency_days: 7,
      difficulty: 3,
    });
    const tasks = await store.getTasks();
    const created = tasks.find(t => t.name === 'Test task');
    expect(created).toBeDefined();
    expect(created.room_ids).toEqual([roomId]);
  });

  it('should support a task assigned to multiple rooms', async () => {
    const rooms = await store.getRooms();
    const roomIds = rooms.slice(0, 2).map(r => r.id);
    await store.createTask({
      name: 'Multi-room task',
      room_ids: roomIds,
      frequency_days: 7,
      difficulty: 2,
    });
    const tasks = await store.getTasks();
    const created = tasks.find(t => t.name === 'Multi-room task');
    expect(created.room_ids).toEqual(roomIds);
  });

  it('should set next_due_date according to frequency_days on creation, not always today', async () => {
    const rooms = await store.getRooms();
    const roomId = rooms[0]?.id || 1;
    await store.createTask({
      name: 'Weekly task',
      room_ids: [roomId],
      frequency_days: 7,
      difficulty: 2,
    });
    const tasks = await store.getTasks();
    const created = tasks.find(t => t.name === 'Weekly task');
    const today = new Date().toISOString().split('T')[0];
    expect(created.next_due_date).not.toBe(today);
    const expected = new Date();
    expected.setDate(expected.getDate() + 7);
    expect(created.next_due_date).toBe(expected.toISOString().split('T')[0]);
  });

  it('should keep next_due_date at today when frequency_days is 0 (una tantum)', async () => {
    const rooms = await store.getRooms();
    const roomId = rooms[0]?.id || 1;
    await store.createTask({
      name: 'One-off task',
      room_ids: [roomId],
      frequency_days: 0,
      difficulty: 2,
    });
    const tasks = await store.getTasks();
    const created = tasks.find(t => t.name === 'One-off task');
    const today = new Date().toISOString().split('T')[0];
    expect(created.next_due_date).toBe(today);
  });

  it('should recompute next_due_date when frequency_days changes on update', async () => {
    await seed();
    const tasks = await store.getTasks();
    const task = tasks.find(t => t.name === 'Seed task');
    await store.updateTask(task.id, { frequency_days: 14 });
    const updatedTasks = await store.getTasks();
    const updated = updatedTasks.find(t => t.id === task.id);
    const expected = new Date();
    expected.setDate(expected.getDate() + 14);
    expect(updated.next_due_date).toBe(expected.toISOString().split('T')[0]);
  });

  it('should compute next_performer_id for ALTERNATING tasks after completion', async () => {
    const userA = await store.addUser('Alice');
    const userB = await store.addUser('Bob');
    await store.setCurrentUser(userA.id);
    const rooms = await store.getRooms();
    const roomId = rooms[0]?.id || 1;
    await store.createTask({
      name: 'Alternating task',
      room_ids: [roomId],
      frequency_days: 7,
      difficulty: 2,
      assignment_type: 'ALTERNATING',
    });
    const tasks = await store.getTasks();
    const task = tasks.find(t => t.name === 'Alternating task');
    expect(task.next_performer_id).toBe(userA.id);

    await store.completeTask(task.id, false);
    const afterTasks = await store.getTasks();
    const after = afterTasks.find(t => t.id === task.id);
    expect(after.next_performer_id).toBe(userB.id);
  });

  it('should get rooms with completion percentage', async () => {
    const rooms = await store.getRooms();
    expect(rooms.length).toBeGreaterThan(0);
    expect(rooms[0]).toHaveProperty('completion_percentage');
  });

  it('should get history', async () => {
    const history = await store.getHistory(30);
    expect(Array.isArray(history)).toBe(true);
  });

  it('should create and get users', async () => {
    const user = await store.addUser('TestUser');
    expect(user).toHaveProperty('id');
    expect(user.name).toBe('TestUser');
    const users = await store.getUsers();
    expect(users.some(u => u.name === 'TestUser')).toBe(true);
  });

  it('should rename a user', async () => {
    const user = await store.addUser('OldName');
    await store.renameUser(user.id, 'NewName');
    const users = await store.getUsers();
    const renamed = users.find(u => u.id === user.id);
    expect(renamed.name).toBe('NewName');
  });

  it('should handle settings', async () => {
    await store.patchPreferences({ test_key: 'test_val' });
    const settings = await store.getSettings();
    expect(Array.isArray(settings)).toBe(true);
    const found = settings.find(s => s.key === 'test_key');
    expect(found).toBeDefined();
    expect(found.value).toBe('test_val');
  });

  it('should handle widgets', async () => {
    const widgets = await store.getWidgets();
    expect(widgets).toHaveProperty('widgets_order');
    expect(widgets.widgets_order).toBe('leaderboard,urgent,rooms');
  });

  it('should handle scoring', async () => {
    await store.patchScoring({ base: 5, split_shared: false });
    const scoring = await store.getScoring();
    expect(scoring.scoring_base).toBe('5');
    expect(scoring.scoring_split_shared).toBe('false');
  });

  it('should complete on-demand and return points', async () => {
    await seed();
    const tasks = await store.getTasks();
    const result = await store.completeOnDemand(tasks[0].id);
    expect(result).toHaveProperty('points');
    expect(typeof result.points).toBe('number');
  });

  it('should undo a completion and restore due date', async () => {
    await seed();
    const beforeTasks = await store.getTasks();
    const taskBefore = beforeTasks.find(t => t.name === 'Seed task');
    const originalDue = taskBefore.next_due_date;

    await store.completeTask(taskBefore.id, true);
    const afterCompleteTasks = await store.getTasks();
    const afterComplete = afterCompleteTasks.find(t => t.id === taskBefore.id);
    expect(afterComplete.next_due_date).not.toBe(originalDue);

    await store.undoComplete(taskBefore.id);
    const afterUndoTasks = await store.getTasks();
    const afterUndo = afterUndoTasks.find(t => t.id === taskBefore.id);
    expect(afterUndo.next_due_date).toBe(originalDue);
  });
});
