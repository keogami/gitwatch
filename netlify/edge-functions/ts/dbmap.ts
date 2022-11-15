export interface DBMap<Key, Value> {
	get(key: Key): Promise<Value | null>
	set(key: Key, value: Value): Promise<boolean>
	has(key: Key): Promise<boolean>
	delete(key: Key): Promise<boolean>
}

