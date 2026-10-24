import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { newId } from '../lib/id'
import { cloneProject, createSampleProject, makeProject, makeTask } from '../lib/project'
import type {
  Member,
  NewTaskInput,
  Project,
  ProjectInput,
  Task,
  WorkCalendar,
} from '../lib/types'

interface PatchProjectInput {
  name?: string
  organization?: string
  description?: string
  startDate?: string
}

interface AppStore {
  projects: Project[]
  createProject: (input: ProjectInput) => string
  updateProject: (projectId: string, patch: PatchProjectInput) => void
  deleteProject: (projectId: string) => void
  duplicateProject: (projectId: string) => string | null
  loadSampleProject: () => string
  importProject: (project: Project) => string
  addTask: (projectId: string, input: NewTaskInput) => string | null
  updateTask: (projectId: string, taskId: string, patch: Partial<NewTaskInput>) => void
  deleteTask: (projectId: string, taskId: string) => void
  addMember: (projectId: string, input: Omit<Member, 'id'>) => void
  updateMember: (projectId: string, memberId: string, patch: Partial<Omit<Member, 'id'>>) => void
  deleteMember: (projectId: string, memberId: string) => void
  updateCalendar: (projectId: string, calendar: WorkCalendar) => void
}

function touch(project: Project): Project {
  return { ...project, updatedAt: new Date().toISOString() }
}

function mapProject(
  projects: Project[],
  projectId: string,
  updater: (project: Project) => Project,
): Project[] {
  return projects.map((project) =>
    project.id === projectId ? touch(updater(project)) : project,
  )
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      projects: [createSampleProject()],

      createProject: (input) => {
        const project = makeProject(input)
        set((state) => ({ projects: [project, ...state.projects] }))
        return project.id
      },

      updateProject: (projectId, patch) => {
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) => ({
            ...project,
            ...patch,
          })),
        }))
      },

      deleteProject: (projectId) => {
        set((state) => ({
          projects: state.projects.filter((project) => project.id !== projectId),
        }))
      },

      duplicateProject: (projectId) => {
        const project = get().projects.find((item) => item.id === projectId)
        if (!project) return null
        const copy = cloneProject(project)
        set((state) => ({ projects: [copy, ...state.projects] }))
        return copy.id
      },

      loadSampleProject: () => {
        const sample = createSampleProject()
        set((state) => ({ projects: [sample, ...state.projects] }))
        return sample.id
      },

      importProject: (project) => {
        const copy = cloneProject(project, '')
        set((state) => ({ projects: [copy, ...state.projects] }))
        return copy.id
      },

      addTask: (projectId, input) => {
        const project = get().projects.find((item) => item.id === projectId)
        if (!project) return null
        const task = makeTask(projectId, input)
        set((state) => ({
          projects: mapProject(state.projects, projectId, (item) => ({
            ...item,
            tasks: [...item.tasks, task],
          })),
        }))
        return task.id
      },

      updateTask: (projectId, taskId, patch) => {
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) => ({
            ...project,
            tasks: project.tasks.map((task) => {
              if (task.id !== taskId) return task
              const { dependencies, ...rest } = patch
              const next: Task = { ...task, ...rest }
              if (patch.name !== undefined) next.name = patch.name.trim()
              if (patch.durationDays !== undefined) {
                next.durationDays = Math.max(1, Math.floor(patch.durationDays) || 1)
              }
              if (patch.notes !== undefined) next.notes = patch.notes.trim()
              if (dependencies !== undefined) {
                next.dependencies = dependencies.map((dependency) => ({
                  ...dependency,
                  id: newId('dep'),
                }))
              }
              return next
            }),
          })),
        }))
      },

      deleteTask: (projectId, taskId) => {
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) => ({
            ...project,
            tasks: project.tasks
              .filter((task) => task.id !== taskId)
              .map((task) => ({
                ...task,
                dependencies: task.dependencies.filter(
                  (dependency) => dependency.predecessorId !== taskId,
                ),
              })),
          })),
        }))
      },

      addMember: (projectId, input) => {
        const member = { ...input, id: newId('mbr') }
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) => ({
            ...project,
            members: [...project.members, member],
          })),
        }))
      },

      updateMember: (projectId, memberId, patch) => {
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) => ({
            ...project,
            members: project.members.map((member) =>
              member.id === memberId ? { ...member, ...patch } : member,
            ),
          })),
        }))
      },

      deleteMember: (projectId, memberId) => {
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) => ({
            ...project,
            members: project.members.filter((member) => member.id !== memberId),
            tasks: project.tasks.map((task) =>
              task.assigneeId === memberId ? { ...task, assigneeId: null } : task,
            ),
          })),
        }))
      },

      updateCalendar: (projectId, calendar) => {
        set((state) => ({
          projects: mapProject(state.projects, projectId, (project) => ({
            ...project,
            calendar: {
              workDays: [...new Set(calendar.workDays)].sort((a, b) => a - b),
              holidays: [...calendar.holidays].sort((a, b) =>
                a.date.localeCompare(b.date),
              ),
            },
          })),
        }))
      },
    }),
    {
      name: 'jadwalsdlc-v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ projects: state.projects }),
    },
  ),
)

export function useProject(projectId: string | undefined): Project | undefined {
  return useAppStore((state) =>
    projectId ? state.projects.find((project) => project.id === projectId) : undefined,
  )
}
