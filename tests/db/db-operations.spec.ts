import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import {
    initPool,
    closePool,
    executeQuery,
    insertRecord,
    selectRecords,
    updateRecords,
    deleteRecords,
    executeTransaction
} from '../../utils/db-utils';

// Define interface for employee data
interface Employee {
    id?: number;
    name: string;
    age: number;
    email: string;
}

// Test suite for database operations
test.describe('MySQL Database Operations', () => {
    // Set up test environment before running tests
    test.beforeAll(async () => {
        // Initialize the connection pool
        await initPool();

        try {
            // Disable foreign key checks first
            await executeQuery('SET FOREIGN_KEY_CHECKS=0');
            
            // Enable strict SQL mode to enforce constraints
            await executeQuery("SET SESSION sql_mode = 'STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'");
            
            // Instead of dropping the table, we'll just truncate it
            await executeQuery('TRUNCATE TABLE emp');
            
            // Ensure the columns have the correct NOT NULL constraints
            await executeQuery(`
                ALTER TABLE emp
                MODIFY name VARCHAR(100) NOT NULL,
                MODIFY age INT NOT NULL,
                MODIFY email VARCHAR(100) NOT NULL
            `);
            
            // Re-enable foreign key checks
            await executeQuery('SET FOREIGN_KEY_CHECKS=1');
        } catch (error) {
            console.error('Error in test setup:', error);
            // Make sure foreign key checks are re-enabled even if there's an error
            await executeQuery('SET FOREIGN_KEY_CHECKS=1');
            throw error;
        }
    });

    // Clean up after all tests are done
    test.afterAll(async () => {
        // Close the connection pool
        await closePool();
    });

    // Test inserting a record
    test('should insert a new employee record', async () => {
        // Arrange
        const empData: Employee = {
            name: faker.person.fullName(),
            age: faker.number.int({ min: 18, max: 65 }),
            email: faker.internet.email()
        };

        // Act
        const result = await insertRecord('emp', empData);

        // Assert
        expect(result.affectedRows).toBe(1);
        expect(result.insertId).toBeGreaterThan(0);
    });

    // Test selecting records
    test('should select employees from the database', async () => {
        // Arrange: Insert multiple employees
        const empsToInsert = Array.from({ length: 3 }, () => ({
            name: faker.person.fullName(),
            age: faker.number.int({ min: 18, max: 65 }),
            email: faker.internet.email()
        }));

        for (const emp of empsToInsert) {
            await insertRecord('emp', emp);
        }

        // Act: Select all employees
        const employees = await selectRecords<Employee>('emp');

        // Assert
        expect(employees.length).toBeGreaterThanOrEqual(3);
        expect(employees[0]).toHaveProperty('id');
        expect(employees[0]).toHaveProperty('name');
        expect(employees[0]).toHaveProperty('age');
        expect(employees[0]).toHaveProperty('email');
    });

    // Test updating records
    test('should update an employee record', async () => {
        // Arrange: Insert an employee
        const email = faker.internet.email();
        const initialEmp: Employee = {
            name: faker.person.fullName(),
            age: faker.number.int({ min: 18, max: 65 }),
            email
        };

        await insertRecord('emp', initialEmp);
        
        // Get the inserted employee
        const [employee] = await selectRecords<Employee>('emp', ['*'], 'email = ?', [email]);
        
        // Act: Update the employee
        const updatedData = {
            name: faker.person.fullName(),
            age: faker.number.int({ min: 18, max: 65 })
        };
        
        const updateResult = await updateRecords(
            'emp',
            updatedData,
            'id = ?',
            [employee.id]
        );

        // Assert
        expect(updateResult.affectedRows).toBe(1);
        
        // Verify the update
        const [updatedEmp] = await selectRecords<Employee>('emp', ['*'], 'id = ?', [employee.id]);
        expect(updatedEmp.name).toBe(updatedData.name);
        expect(updatedEmp.age).toBe(updatedData.age);
        expect(updatedEmp.email).toBe(email);
    });

    // Test deleting records
    test('should delete an employee record', async () => {
        // Arrange: Insert an employee
        const empData: Employee = {
            name: faker.person.fullName(),
            age: faker.number.int({ min: 18, max: 65 }),
            email: faker.internet.email()
        };

        const result = await insertRecord('emp', empData);
        const empId = result.insertId;
        
        // Act: Delete the employee
        const deleteResult = await deleteRecords('emp', 'id = ?', [empId]);
        
        // Assert
        expect(deleteResult.affectedRows).toBe(1);
        
        // Verify deletion
        const employees = await selectRecords<Employee>('emp', ['*'], 'id = ?', [empId]);
        expect(employees.length).toBe(0);
    });

    // Test transactions
    test('should execute a transaction successfully', async () => {
        // Arrange
        const emp1: Employee = {
            name: faker.person.fullName(),
            age: faker.number.int({ min: 18, max: 65 }),
            email: faker.internet.email()
        };
        
        const emp2: Employee = {
            name: faker.person.fullName(),
            age: faker.number.int({ min: 18, max: 65 }),
            email: faker.internet.email()
        };
        
        // Act: Execute a transaction to insert multiple employees
        const queries = [
            {
                query: 'INSERT INTO emp (name, age, email) VALUES (?, ?, ?)',
                params: [emp1.name, emp1.age, emp1.email]
            },
            {
                query: 'INSERT INTO emp (name, age, email) VALUES (?, ?, ?)',
                params: [emp2.name, emp2.age, emp2.email]
            }
        ];
        
        const results = await executeTransaction(queries);
        
        // Assert
        expect(results.length).toBe(2);
        expect(results[0].affectedRows).toBe(1);
        expect(results[1].affectedRows).toBe(1);
        
        // Verify both employees were inserted
        const insertedEmps = await selectRecords<Employee>('emp', ['*'], 'email IN (?, ?)', [emp1.email, emp2.email]);
        expect(insertedEmps.length).toBe(2);
    });

    // Test transaction rollback
    test('should rollback transaction on error', async () => {
        try {
            // First disable foreign key checks
            await executeQuery('SET FOREIGN_KEY_CHECKS=0');
            
            // Clean both tables to have a known state
            await executeQuery('DELETE FROM manager WHERE 1=1');
            await executeQuery('DELETE FROM emp WHERE 1=1');
            
            // Re-enable foreign key checks
            await executeQuery('SET FOREIGN_KEY_CHECKS=1');
            
            // Arrange
            const validEmail = faker.internet.email();
            const emp1: Employee = {
                name: faker.person.fullName(),
                age: faker.number.int({ min: 18, max: 65 }),
                email: validEmail
            };
            
            // Insert an employee first to create a duplicate email constraint
            await insertRecord('emp', emp1);
            
            // Verify we have exactly one record to start by using a more specific query
            const initialEmps = await selectRecords<Employee>('emp', ['*'], 'email = ?', [validEmail]);
            expect(initialEmps.length).toBe(1);
            
            // Act & Assert: Try to insert an employee with duplicate email which should fail
            const emp2: Employee = {
                name: faker.person.fullName(),
                age: faker.number.int({ min: 18, max: 65 }),
                email: validEmail // Duplicate email that will cause a constraint violation
            };
            
            const anotherEmp: Employee = {
                name: faker.person.fullName(),
                age: faker.number.int({ min: 18, max: 65 }),
                email: faker.internet.email()
            };
            
            // This transaction should fail due to the duplicate email
            const queries = [
                {
                    query: 'INSERT INTO emp (name, age, email) VALUES (?, ?, ?)',
                    params: [anotherEmp.name, anotherEmp.age, anotherEmp.email]
                },
                {
                    query: 'INSERT INTO emp (name, age, email) VALUES (?, ?, ?)',
                    params: [emp2.name, emp2.age, emp2.email]
                }
            ];
            
            await expect(executeTransaction(queries)).rejects.toThrow();
            
            // Verify that the specific record we added wasn't changed
            const finalEmps = await selectRecords<Employee>('emp', ['*'], 'email = ?', [validEmail]);
            expect(finalEmps.length).toBe(1);
            
            // Also verify anotherEmp's email doesn't exist (rollback worked)
            const addedEmps = await selectRecords<Employee>('emp', ['*'], 'email = ?', [anotherEmp.email]);
            expect(addedEmps.length).toBe(0);
        } finally {
            // Ensure foreign key checks are re-enabled 
            await executeQuery('SET FOREIGN_KEY_CHECKS=1');
        }
    });

    // Test parameterized queries to prevent SQL injection
    test('should handle parameterized queries safely', async () => {
        // Arrange: Prepare a potentially dangerous input
        const maliciousInput = "Robert'; DROP TABLE emp; --";
        
        const emp: Employee = {
            name: maliciousInput,
            age: faker.number.int({ min: 18, max: 65 }),
            email: faker.internet.email()
        };
        
        // Act: Insert with parameterized query
        await insertRecord('emp', emp);
        
        // Assert: The table still exists and the query was sanitized
        const [insertedEmp] = await selectRecords<Employee>(
            'emp', 
            ['*'], 
            'name = ?', 
            [maliciousInput]
        );
        
        expect(insertedEmp).toBeDefined();
        expect(insertedEmp.name).toBe(maliciousInput);
        
        // Verify the table wasn't dropped
        const employees = await selectRecords<Employee>('emp');
        expect(employees.length).toBeGreaterThan(0);
    });

    // Test handling large result sets
    test('should handle queries with large result sets', async () => {
        // Arrange: Insert many records
        const empsToInsert = Array.from({ length: 50 }, () => ({
            name: faker.person.fullName(),
            age: faker.number.int({ min: 18, max: 65 }),
            email: faker.internet.email()
        }));
        
        for (const emp of empsToInsert) {
            await insertRecord('emp', emp);
        }
        
        // Act: Perform a query that should return many records
        const employees = await selectRecords<Employee>('emp');
        
        // Assert
        expect(employees.length).toBeGreaterThanOrEqual(50);
    });

    // Test executing a raw SQL query
    test('should execute raw SQL queries', async () => {
        // Act: Execute a complex query
        const results = await executeQuery<{ total: number }>('SELECT COUNT(*) as total FROM emp');
        
        // Assert
        expect(results[0]).toHaveProperty('total');
        expect(typeof results[0].total).toBe('number');
    });
});