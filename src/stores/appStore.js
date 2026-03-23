import { defineStore } from 'pinia'
import { ref } from 'vue'
import { planesData, squadronData } from '../mock/planes'

export const useAppStore = defineStore('app', () => {
  const selectedPlaneId = ref('P001')
  const selectedSquadronId = ref(null)
  const selectorMode = ref('plane') // 'plane' | 'squadron'

  const planes = ref(planesData)
  const squadrons = ref(squadronData)

  function selectPlane(id) {
    selectedPlaneId.value = id
    selectorMode.value = 'plane'
  }

  function selectSquadron(id) {
    selectedSquadronId.value = id
    selectorMode.value = 'squadron'
  }

  function getPlaneById(id) {
    return planes.value.find(p => p.id === id)
  }

  function getPlanesBySquadron(squadronId) {
    const sq = squadrons.value.find(s => s.id === squadronId)
    if (!sq) return []
    return planes.value.filter(p => sq.planeIds.includes(p.id))
  }

  return {
    selectedPlaneId,
    selectedSquadronId,
    selectorMode,
    planes,
    squadrons,
    selectPlane,
    selectSquadron,
    getPlaneById,
    getPlanesBySquadron,
  }
})
